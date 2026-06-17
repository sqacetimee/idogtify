"""
Fine-tune ConvNeXt-Small (ImageNet-21k pretrained) on Stanford Dogs.

Why this setup is better than the previous version
---------------------------------------------------
Model  : ConvNeXt-Small instead of EfficientNet-B3
Weights: ImageNet-21k (21,000 classes) instead of ImageNet-1k (1,000)
         → the backbone already understands far more fine-grained visual detail
         → linear probe alone reaches ~70-78% instead of ~55-65%
Training: two-phase with differential learning rates + label smoothing

Expected accuracy
-----------------
Phase 1 (head only, ~15 min CPU):  70–78 % top-1
Phase 2 (full fine-tune, GPU):     84–90 % top-1
Phase 2 on CPU is slow (~6 h); interrupt any time — best model already saved.

Run from backend/ (venv active):
    python scripts/train.py

Downloads on first run:
  Stanford Dogs images  ~800 MB  →  data/stanford_dogs/
  ConvNeXt-Small weights ~95 MB  →  torch cache (~/.cache/torch)

Output: app/ml/models/dog_breed_classifier.pth
Restart the backend after training.
"""

import os
import random
import sys
import tarfile
import time
import urllib.request
from pathlib import Path

import timm
import torch
import torch.nn as nn
from timm.data import create_transform, resolve_model_data_config
from timm.loss import LabelSmoothingCrossEntropy
from torch.utils.data import DataLoader, Subset
from torchvision.datasets import ImageFolder

# ── Config ────────────────────────────────────────────────────────────────────

MODEL_NAME   = "convnext_small.fb_in22k_ft_in1k"
SAVE_PATH    = "app/ml/models/dog_breed_classifier.pth"
DATA_DIR     = Path("data") / "stanford_dogs"
BATCH_SIZE   = 16
NUM_WORKERS  = 0       # keep 0 on Windows
DEVICE       = torch.device("cuda" if torch.cuda.is_available() else "cpu")

P1_EPOCHS    = 10      # head only — fast
P1_LR        = 1e-3

P2_EPOCHS    = 15      # full fine-tune — interrupt any time
P2_LR_HEAD   = 5e-5
P2_LR_BACK   = 5e-6

LABEL_SMOOTH = 0.1

print(f"Device : {DEVICE}")
print(f"Model  : {MODEL_NAME}")

# ── Stanford Dogs downloader ──────────────────────────────────────────────────

IMAGES_URL   = "http://vision.stanford.edu/aditya86/ImageNetDogs/images.tar"
IMAGES_TAR   = DATA_DIR / "images.tar"
IMAGES_DIR   = DATA_DIR / "Images"


def _reporthook(count, block, total):
    done = count * block
    pct  = min(done * 100 // total, 100) if total > 0 else 0
    bar  = "#" * (pct // 2) + "-" * (50 - pct // 2)
    sys.stdout.write(f"\r  [{bar}] {pct}%  {done//1_048_576} MB")
    sys.stdout.flush()


def download_stanford_dogs() -> Path:
    """Download and extract Stanford Dogs if not already present."""
    if IMAGES_DIR.exists() and any(IMAGES_DIR.iterdir()):
        print(f"Stanford Dogs already at {IMAGES_DIR}")
        return IMAGES_DIR

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not IMAGES_TAR.exists():
        print(f"Downloading Stanford Dogs (~800 MB) from Stanford …")
        urllib.request.urlretrieve(IMAGES_URL, IMAGES_TAR, _reporthook)
        print()

    print(f"Extracting {IMAGES_TAR} …")
    with tarfile.open(IMAGES_TAR) as tar:
        tar.extractall(DATA_DIR)
    print(f"Extracted to {IMAGES_DIR}")
    return IMAGES_DIR


# ── Dataset ───────────────────────────────────────────────────────────────────

images_dir = download_stanford_dogs()

# ImageFolder reads the directory structure: Images/n02085620-Chihuahua/*.jpg
full_ds = ImageFolder(str(images_dir))

# Parse breed names from synset folder names: "n02085620-Chihuahua" → "Chihuahua"
class_names = [c.split("-", 1)[1].replace("_", " ").title() for c in full_ds.classes]
num_classes = len(class_names)
print(f"Breeds : {num_classes}")
print(f"Images : {len(full_ds):,}")

# 80 / 20 split with a fixed seed (reproducible, no scipy needed)
indices = list(range(len(full_ds)))
random.Random(42).shuffle(indices)
split   = int(0.8 * len(full_ds))
train_idx, val_idx = indices[:split], indices[split:]

# Build timm transforms from the model's own config (correct size + normalisation)
_probe_model = timm.create_model(MODEL_NAME, pretrained=False)
_data_cfg    = resolve_model_data_config(_probe_model)
del _probe_model

train_transform = create_transform(**_data_cfg, is_training=True)
val_transform   = create_transform(**_data_cfg, is_training=False)

# Apply per-split transforms via wrapper
class _TransformSubset(torch.utils.data.Dataset):
    def __init__(self, ds, idx, transform):
        self.ds, self.idx, self.transform = ds, idx, transform
    def __len__(self):  return len(self.idx)
    def __getitem__(self, i):
        img, label = self.ds.loader(self.ds.samples[self.idx[i]][0]), self.ds.targets[self.idx[i]]
        return self.transform(img), label

train_ds = _TransformSubset(full_ds, train_idx, train_transform)
val_ds   = _TransformSubset(full_ds, val_idx,   val_transform)
print(f"Train  : {len(train_ds):,}   Val: {len(val_ds):,}")

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=NUM_WORKERS)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)

# ── Model ─────────────────────────────────────────────────────────────────────

print(f"\nLoading {MODEL_NAME} pretrained weights …")
model = timm.create_model(MODEL_NAME, pretrained=True, num_classes=num_classes)
model = model.to(DEVICE)
total_params = sum(p.numel() for p in model.parameters()) / 1e6
print(f"Parameters: {total_params:.1f}M")

# ── Helpers ───────────────────────────────────────────────────────────────────

def set_backbone_grad(requires: bool) -> None:
    for name, param in model.named_parameters():
        if "head" not in name:
            param.requires_grad = requires

def trainable_count() -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad) // 1000

def topk_acc(out, target, k):
    _, pred = out.topk(k, dim=1)
    return pred.eq(target.unsqueeze(1).expand_as(pred)).any(dim=1).float().mean().item() * 100

def run_epoch(loader, criterion, optimizer=None, label="") -> tuple[float, float, float]:
    training = optimizer is not None
    model.train(training)
    ls = t1 = t5 = 0.0
    t0 = time.time()
    with torch.set_grad_enabled(training):
        for i, (imgs, labels) in enumerate(loader, 1):
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            out  = model(imgs)
            loss = criterion(out, labels)
            if training:
                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
            ls += loss.item(); t1 += topk_acc(out, labels, 1); t5 += topk_acc(out, labels, 5)
            if i % 40 == 0 or i == len(loader):
                print(f"  {label} {i:>4}/{len(loader)}  loss={ls/i:.3f}  "
                      f"top1={t1/i:.1f}%  top5={t5/i:.1f}%  ({time.time()-t0:.0f}s)", flush=True)
    n = len(loader)
    return ls/n, t1/n, t5/n

best_top1 = 0.0

def save_best(val_top1, phase):
    global best_top1
    if val_top1 > best_top1:
        best_top1 = val_top1
        os.makedirs(os.path.dirname(SAVE_PATH), exist_ok=True)
        torch.save({
            "model_state_dict"  : {k: v.cpu() for k, v in model.state_dict().items()},
            "class_names"       : class_names,
            "num_classes"       : num_classes,
            "arch"              : MODEL_NAME,
            "framework"         : "timm",
            "val_top1_accuracy" : round(val_top1, 2),
        }, SAVE_PATH)
        print(f"  ★ New best {val_top1:.1f}% ({phase}) — saved to {SAVE_PATH}")

# ── Phase 1: head only ────────────────────────────────────────────────────────

set_backbone_grad(False)
print(f"\n{'='*60}")
print(f"Phase 1 — head only  ({trainable_count()}K trainable params)")
print(f"{'='*60}")

criterion = LabelSmoothingCrossEntropy(LABEL_SMOOTH)
opt1   = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                            lr=P1_LR, weight_decay=0.01)
sched1 = torch.optim.lr_scheduler.CosineAnnealingLR(opt1, T_max=P1_EPOCHS)

for ep in range(1, P1_EPOCHS + 1):
    print(f"\nEpoch {ep}/{P1_EPOCHS}")
    run_epoch(train_loader, criterion, opt1, "train")
    _, v1, v5 = run_epoch(val_loader, criterion, None, "val  ")
    sched1.step()
    print(f"  → val top-1={v1:.1f}%  top-5={v5:.1f}%")
    save_best(v1, "phase-1")

# ── Phase 2: full fine-tune ───────────────────────────────────────────────────

set_backbone_grad(True)
print(f"\n{'='*60}")
print(f"Phase 2 — full fine-tune  ({trainable_count()}K trainable params)")
print(f"  backbone lr={P2_LR_BACK}   head lr={P2_LR_HEAD}")
print(f"  Interrupt (Ctrl-C) any time — best model already saved.")
print(f"{'='*60}")

# Reload best Phase-1 checkpoint
ckpt = torch.load(SAVE_PATH, map_location=DEVICE, weights_only=False)
model.load_state_dict(ckpt["model_state_dict"])
model = model.to(DEVICE)

head_params = [p for n, p in model.named_parameters() if "head" in n]
back_params = [p for n, p in model.named_parameters() if "head" not in n]

opt2   = torch.optim.AdamW([
    {"params": back_params, "lr": P2_LR_BACK},
    {"params": head_params,  "lr": P2_LR_HEAD},
], weight_decay=0.01)
sched2 = torch.optim.lr_scheduler.CosineAnnealingLR(opt2, T_max=P2_EPOCHS)

try:
    for ep in range(1, P2_EPOCHS + 1):
        print(f"\nEpoch {ep}/{P2_EPOCHS}")
        run_epoch(train_loader, criterion, opt2, "train")
        _, v1, v5 = run_epoch(val_loader, criterion, None, "val  ")
        sched2.step()
        print(f"  → val top-1={v1:.1f}%  top-5={v5:.1f}%")
        save_best(v1, "phase-2")
except KeyboardInterrupt:
    print("\nInterrupted — best checkpoint already saved.")

print(f"\n✓ Training complete.  Best val top-1: {best_top1:.1f}%")
print(f"  Restart the backend to load the new model.")
