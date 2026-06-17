"""
Dog breed classifier.

Load priority:
  1. Fine-tuned EfficientNet-B3 trained on Stanford Dogs (120 breeds)
     → app/ml/models/dog_breed_classifier.pth
     → Run backend/train.py once to produce this file.

  2. EfficientNet-B0 pretrained on ImageNet (fallback, ~21 MB auto-download)
     → 116 dog breed classes from ImageNet; reasonable but not breed-specialist.

  3. Mock colour classifier (if PyTorch fails to load entirely).

The pipeline always calls classify() — it never needs to know which source is active.
"""
from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL.Image import Image as PILImage

log = logging.getLogger(__name__)

# Path to the fine-tuned Stanford Dogs model produced by train.py
_TRAINED_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "dog_breed_classifier.pth"
)

# ── ImageNet dog-breed fallback map (used when no trained model exists) ───────
# Range 151–266 covers all ILSVRC dog-breed synsets.
# Duplicate names (Poodle 263/264/265; Husky 248/250) are merged by summing.
_INDEX_TO_BREED: dict[int, str] = {
    151: "Chihuahua", 152: "Japanese Chin", 153: "Maltese", 154: "Pekingese",
    155: "Shih Tzu", 156: "Blenheim Spaniel", 157: "Papillon", 158: "Toy Terrier",
    159: "Rhodesian Ridgeback", 160: "Afghan Hound", 161: "Basset Hound",
    162: "Beagle", 163: "Bloodhound", 164: "Bluetick Coonhound",
    165: "Black-and-Tan Coonhound", 166: "Walker Hound", 167: "English Foxhound",
    168: "Redbone Coonhound", 169: "Borzoi", 170: "Irish Wolfhound",
    171: "Italian Greyhound", 172: "Whippet", 173: "Ibizan Hound",
    174: "Norwegian Elkhound", 175: "Otterhound", 176: "Saluki",
    177: "Scottish Deerhound", 178: "Weimaraner",
    179: "Staffordshire Bull Terrier", 180: "American Staffordshire Terrier",
    181: "Bedlington Terrier", 182: "Border Terrier", 183: "Kerry Blue Terrier",
    184: "Irish Terrier", 185: "Norfolk Terrier", 186: "Norwich Terrier",
    187: "Yorkshire Terrier", 188: "Wire Fox Terrier", 189: "Lakeland Terrier",
    190: "Sealyham Terrier", 191: "Airedale Terrier", 192: "Cairn Terrier",
    193: "Australian Terrier", 194: "Dandie Dinmont Terrier", 195: "Boston Terrier",
    196: "Miniature Schnauzer", 197: "Giant Schnauzer", 198: "Standard Schnauzer",
    199: "Scottish Terrier", 200: "Tibetan Terrier", 201: "Silky Terrier",
    202: "Soft-Coated Wheaten Terrier", 203: "West Highland White Terrier",
    204: "Lhasa Apso", 205: "Flat-Coated Retriever", 206: "Curly-Coated Retriever",
    207: "Golden Retriever", 208: "Labrador Retriever",
    209: "Chesapeake Bay Retriever", 210: "German Shorthaired Pointer",
    211: "Vizsla", 212: "English Setter", 213: "Irish Setter",
    214: "Gordon Setter", 215: "Brittany Spaniel", 216: "Clumber Spaniel",
    217: "English Springer Spaniel", 218: "Welsh Springer Spaniel",
    219: "Cocker Spaniel", 220: "Sussex Spaniel", 221: "Irish Water Spaniel",
    222: "Kuvasz", 223: "Schipperke", 224: "Groenendael", 225: "Malinois",
    226: "Briard", 227: "Kelpie", 228: "Komondor", 229: "Old English Sheepdog",
    230: "Shetland Sheepdog", 231: "Collie", 232: "Border Collie",
    233: "Bouvier des Flandres", 234: "Rottweiler", 235: "German Shepherd",
    236: "Doberman Pinscher", 237: "Miniature Pinscher",
    238: "Greater Swiss Mountain Dog", 239: "Bernese Mountain Dog",
    240: "Appenzeller", 241: "Entlebucher", 242: "Boxer", 243: "Bull Mastiff",
    244: "Tibetan Mastiff", 245: "French Bulldog", 246: "Great Dane",
    247: "Saint Bernard", 248: "Siberian Husky", 249: "Alaskan Malamute",
    250: "Siberian Husky", 251: "Dalmatian", 252: "Affenpinscher",
    253: "Basenji", 254: "Pug", 255: "Leonberger", 256: "Samoyed",
    257: "Pomeranian", 258: "Chow Chow", 259: "Keeshond", 260: "Griffon",
    261: "Pembroke Welsh Corgi", 262: "Cardigan Welsh Corgi",
    263: "Poodle", 264: "Poodle", 265: "Poodle", 266: "Mexican Hairless",
}
_IMAGENET_DOG_INDICES = sorted(_INDEX_TO_BREED.keys())


class RealDogClassifier:
    """
    Breed classifier with a three-level load hierarchy.

    After train.py completes, the fine-tuned Stanford Dogs model is used.
    Before that, the ImageNet pretrained fallback provides reasonable results.
    """

    def __init__(self) -> None:
        self._model       = None
        self._transform   = None
        self._device      = None
        self._class_names: list[str] | None = None   # None = use ImageNet map
        self._mode        = "unavailable"
        self._load()

    def _load(self) -> None:
        try:
            import torch
            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        except ImportError:
            print("[iDogtify] PyTorch not found — classifier unavailable.")
            return

        # ── Priority 1: fine-tuned Stanford Dogs model (local file) ──────
        if os.path.exists(_TRAINED_MODEL_PATH):
            try:
                self._load_trained_model(_TRAINED_MODEL_PATH)
                return
            except Exception as exc:
                log.warning("Could not load local trained model: %s", exc)
                print(f"[iDogtify] Local model error: {exc}")

        # ── Priority 2: download fine-tuned model from HuggingFace Hub ───
        hf_repo = os.getenv("HF_MODEL_REPO", "")
        hf_file = os.getenv("HF_MODEL_FILE", "dog_breed_classifier.pth")
        if hf_repo:
            try:
                path = self._download_from_hub(hf_repo, hf_file)
                self._load_trained_model(path)
                return
            except Exception as exc:
                log.warning("Could not download model from HuggingFace Hub: %s", exc)
                print(f"[iDogtify] HuggingFace Hub error: {exc}")

        # ── Priority 3: ImageNet pretrained EfficientNet-B0 (fallback) ───
        try:
            self._load_imagenet_model()
        except Exception as exc:
            log.warning("Could not load ImageNet model: %s", exc)
            print(f"[iDogtify] ImageNet fallback error: {exc}")

    def _download_from_hub(self, repo_id: str, filename: str) -> str:
        from huggingface_hub import hf_hub_download
        print(f"[iDogtify] Downloading model from HuggingFace Hub: {repo_id}/{filename} …")
        path = hf_hub_download(repo_id=repo_id, filename=filename)
        print(f"[iDogtify] Downloaded to {path}")
        return path

    def _load_trained_model(self, path: str) -> None:
        import torch
        import timm
        from timm.data import create_transform, resolve_model_data_config

        checkpoint   = torch.load(path, map_location="cpu", weights_only=False)
        class_names  = checkpoint["class_names"]
        num_classes  = checkpoint["num_classes"]
        arch         = checkpoint.get("arch", "convnext_small.fb_in22k_ft_in1k")
        framework    = checkpoint.get("framework", "timm")

        if framework == "timm":
            model = timm.create_model(arch, pretrained=False, num_classes=num_classes)
            model.load_state_dict(checkpoint["model_state_dict"])
            data_cfg = resolve_model_data_config(model)
            self._transform = create_transform(**data_cfg, is_training=False)
        else:
            # Legacy EfficientNet-B3 checkpoint (torchvision)
            from torchvision.models import efficientnet_b3
            from torchvision import transforms
            model = efficientnet_b3(weights=None)
            model.classifier[-1] = torch.nn.Linear(
                model.classifier[-1].in_features, num_classes
            )
            model.load_state_dict(checkpoint["model_state_dict"])
            self._transform = transforms.Compose([
                transforms.Resize(320),
                transforms.CenterCrop(300),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])

        model.eval()
        self._model       = model.to(self._device)
        self._class_names = class_names
        self._mode        = "stanford-dogs"
        val_acc = checkpoint.get("val_top1_accuracy", "?")
        print(
            f"[iDogtify] Stanford Dogs model loaded — "
            f"{arch}, {num_classes} breeds, "
            f"val top-1 {val_acc}% ({self._device})."
        )

    def _load_imagenet_model(self) -> None:
        from torchvision.models import EfficientNet_B0_Weights, efficientnet_b0

        weights = EfficientNet_B0_Weights.DEFAULT
        model   = efficientnet_b0(weights=weights)
        model.eval()
        model = model.to(self._device)

        self._model       = model
        self._transform   = weights.transforms()
        self._class_names = None   # use _INDEX_TO_BREED map
        self._mode        = "imagenet"
        print(f"[iDogtify] ImageNet fallback classifier ready ({self._device}).")

    @property
    def is_available(self) -> bool:
        return self._model is not None

    @property
    def mode(self) -> str:
        return self._mode

    def classify(self, image: "PILImage") -> dict[str, float]:
        """
        Return {breed_name: probability} summing to 1.0.
        Fully deterministic — same image always gives the same output.
        """
        import torch
        import torch.nn.functional as F

        x = self._transform(image).unsqueeze(0).to(self._device)
        with torch.no_grad():
            logits = self._model(x)
            probs  = F.softmax(logits, dim=1).squeeze()

        if self._mode == "stanford-dogs":
            # Direct mapping: output index i → class_names[i]
            scores = {
                name: float(probs[i].item())
                for i, name in enumerate(self._class_names)
            }
        else:
            # ImageNet fallback: filter + merge dog classes
            scores: dict[str, float] = {}
            for idx in _IMAGENET_DOG_INDICES:
                name = _INDEX_TO_BREED[idx]
                scores[name] = scores.get(name, 0.0) + float(probs[idx].item())

        total = sum(scores.values()) or 1.0
        return {name: prob / total for name, prob in scores.items()}
