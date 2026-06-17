# iDogtify ML Algorithm

## 1. Overview

iDogtify identifies dog breeds from a single image using a multi-stage visual
analysis pipeline.  The system produces a ranked list of visually similar breeds
with calibrated confidence scores.

All outputs are **appearance-based estimates**, not genetic breed tests.  A
trained model can only learn the statistical relationship between pixel patterns
and breed labels; it cannot determine DNA, ancestry, or actual genetic breed
percentages from a photograph.

---

## 2. Why Visual Breed Identification Is Not DNA Testing

| Visual ID (iDogtify)                     | DNA Testing                              |
|------------------------------------------|------------------------------------------|
| Analyses pixel patterns in one image     | Analyses actual genetic markers          |
| Result depends on coat, lighting, angle  | Result independent of appearance         |
| Mixed breeds may resemble purebreds      | Detects ancestry regardless of look      |
| Purebred-looking dogs may be mixed       | Accurate to actual breed percentages     |
| Probability = visual similarity score    | Probability = allele frequency estimate  |

iDogtify reports **visual similarity estimates**: how closely an image matches
the typical appearance of known breeds, compared against a database of breed
appearance prototypes derived from training images.

---

## 3. Full Prediction Pipeline

```
Image / Live Frame
→ Validate Image            (content-type, file size, RGB conversion)
→ Detect Dog                (app/ml/detector.py)
→ Crop Dog                  (bbox from detector → tight crop)
→ Score Image Quality       (app/ml/quality.py)
→ Extract Visual Embedding  (app/ml/feature_extractor.py)
→ Classify Breed            (app/ml/pipeline.py — mock classifier)
→ Prototype Similarity      (app/ml/breed_database.py — cosine similarity)
→ Hybrid Score Fusion       (app/ml/scorer.py)
→ Mixed-Breed Logic         (app/ml/confidence.py)
→ Confidence Calibration    (app/ml/confidence.py)
→ Final API Response        (app/models/schemas.py — PredictionResponse)
```

---

## 4. Dog Detection

**Module:** `app/ml/detector.py` — `DogDetector`

The detector determines whether the input image contains a dog and, if so,
returns a bounding box for the dog's location.

**Current (mock):** Pixel-level brightness and colour variance heuristics.
Organic subjects (fur, texture) exhibit higher local contrast than blank
backgrounds or solid-colour images.  Returns a conservative bbox covering
~90 % of the frame (typical for uploaded pet photos).

**Future (real model):**
- YOLOv8n or RT-DETR fine-tuned on Stanford Dogs bounding-box annotations
  combined with the COCO "dog" category.
- Returns tight bounding boxes per detected dog.
- Largest-area detection is used for breed classification.
- Multiple dogs: analyse each crop independently (future roadmap).

**Output:**
```json
{
  "dog_detected": true,
  "detection_confidence": 0.91,
  "bbox": { "x1": 15, "y1": 15, "x2": 285, "y2": 285 }
}
```

---

## 5. Image Quality Scoring

**Module:** `app/ml/quality.py` — `ImageQualityAnalyzer`

Quality scoring has two purposes:
1. Surface actionable UI warnings ("image may be blurry").
2. Downweight predictions in the confidence calibration step.

**Metrics (composite weights):**

| Dimension  | Weight | Method                                      |
|------------|--------|---------------------------------------------|
| Brightness | 35 %   | Mean pixel luminance; penalises dark/blown   |
| Sharpness  | 40 %   | Laplacian variance proxy (gradient variance) |
| Resolution | 20 %   | Minimum image dimension vs. 224 px threshold |
| Aspect     |  5 %   | Penalises extreme crops (ratio > 4:1)        |

**Labels:** `good` (≥ 0.65) · `fair` (≥ 0.40) · `poor` (< 0.40)

---

## 6. Feature Extraction

**Module:** `app/ml/feature_extractor.py` — `FeatureExtractor`

Produces a deterministic, L2-normalised 28-dimensional embedding vector.

**Current (mock) — colour histogram + global statistics:**

```
[0:8]   R channel histogram  (8 bins, 0–255, normalised by pixel count)
[8:16]  G channel histogram
[16:24] B channel histogram
[24]    Mean brightness       (0–1)
[25]    Brightness std-dev    (0–2)
[26]    Sharpness proxy       (0–1)
[27]    Colour contrast       (0–2)
```

Same image → same embedding every time (deterministic).

**Future (real backbone):**
- `EfficientNet-B3` or `ConvNeXt-S` for highest accuracy
- `MobileNetV3-Large` for fastest live-camera inference
- `CLIP ViT-B/32` for rich semantic embeddings (zero-shot capable)

Steps:
1. Load pretrained model once at startup (FastAPI lifespan event).
2. Preprocess: resize → centre-crop to 224×224 → ImageNet normalisation.
3. Forward pass → extract penultimate layer activations.
4. L2-normalise output → embedding vector (e.g. 1 280 d for EfficientNet-B3).

---

## 7. Breed Classifier

**Module:** `app/ml/pipeline.py` — `_mock_classifier()`

Produces a probability distribution over all breeds.

**Current (mock):** Colour-feature logits via a handcrafted weight table →
softmax (temperature = 0.30) → 5 % Dirichlet noise for variety.

**Future (real classifier):**
```python
preprocessed = transform(image).unsqueeze(0).to(device)
with torch.no_grad():
    logits = model(preprocessed)          # backbone + linear head
probs = torch.softmax(logits, dim=-1).squeeze().cpu().numpy()
return dict(zip(BREED_NAMES, probs.tolist()))
```

The classifier head is a single linear layer trained on top of a frozen or
fine-tuned backbone.  Training data: Stanford Dogs (120 breeds, 20 000+ images).

---

## 8. Breed Prototype Database

**Module:** `app/ml/breed_database.py` — `BreedPrototypeDatabase`

Stores one L2-normalised embedding vector per breed (or coat variant).
At query time, cosine similarity between the input embedding and each prototype
ranks breeds by visual closeness.

**Current (mock):**
Prototypes are generated from synthetic colour-stripe images that match each
breed's typical coat colour.  This ensures prototypes and real-image embeddings
inhabit exactly the same vector space.

**Future (real prototypes):**
1. Run all Stanford Dogs training images through `FeatureExtractor`.
2. Average per-breed embeddings → one prototype vector per breed.
3. Optionally cluster within breeds (Yellow / Black / Chocolate Lab,
   White / Gray Poodle, etc.) → multiple prototypes per breed.
4. Persist as `.npy` file; load once at startup.
5. Optional: FAISS index for sub-millisecond search at scale.

**Query:** cosine similarity = dot product of two L2-normalised vectors.

---

## 9. Dataset Cross-Referencing

### Stanford Dogs Dataset
- **URL:** http://vision.stanford.edu/aditya86/ImageNetDogs/
- **Size:** 120 breeds, 20 580 images
- **Use:** Primary breed classifier training + prototype embedding generation
- **Annotations:** Per-image bounding boxes useful for detector training

### Oxford-IIIT Pet Dataset
- **URL:** https://www.robots.ox.ac.uk/~vgg/data/pets/
- **Use:** Validation / held-out testing, cross-dataset breed coverage check
- **Annotations:** Pixel-level segmentation useful for foreground crop quality

Neither dataset is downloaded yet.  Both are referenced in the architecture for
the post-training phase.

---

## 10. Hybrid Scoring Formula

**Module:** `app/ml/scorer.py` — `HybridBreedScorer`

Combines four signal sources into a single ranked probability:

```
final_score =
    0.55 × classifier_probability
  + 0.30 × embedding_similarity
  + 0.10 × detection_confidence
  + 0.05 × image_quality_score
```

**Rationale for weights:**
- Classifier (0.55): primary signal — trained discriminatively on breed labels.
- Similarity (0.30): retrieval-based re-ranking from prototype database; robust
  to distribution shift between training and deployment images.
- Detection (0.10): low-confidence detections should reduce overall certainty.
- Quality (0.05): poor-quality images carry genuine information loss.

Detection confidence and quality are scalars applied uniformly to all breeds
before normalisation, creating a probability floor.  This compresses the
top-breed probability by approximately 8–12 percentage points compared to
a pure classifier output — calibrated thresholds in `confidence.py` account
for this.

Final scores are normalised over the top-4 breeds so they sum to 1.0.

---

## 11. Mixed-Breed Visual Similarity Logic

**Module:** `app/ml/confidence.py`

iDogtify does **not** claim to detect genetic mixed-breed percentages.  It
reports whether the visual appearance is consistent with a single dominant breed
or spread across multiple breed archetypes.

| Condition                              | Label                    | mixed_breed_likely |
|----------------------------------------|--------------------------|--------------------|
| Top prob ≥ 0.50 and 2nd prob < 0.20   | "Purebred vibes"         | false              |
| Top prob ≥ 0.28 and multiple breed mix | "Paw-sible breed mix"    | true               |
| Top prob < 0.28                        | "Uncertain visual match" | true               |

---

## 12. Confidence Calibration

**Module:** `app/ml/confidence.py` — `calibrate()`

| Level  | Conditions                                                         |
|--------|--------------------------------------------------------------------|
| high   | Top prob ≥ 0.43 AND gap (1st–2nd) ≥ 0.12 AND quality fair+ AND detection OK |
| medium | Top prob ≥ 0.28 AND quality fair+                                  |
| low    | Everything else                                                    |

Low confidence triggers:
- Warning banner in the UI ("iDogtify isn't quite sure")
- Scout mascot's worried face
- "Try a clearer photo" copy

---

## 13. Automatic Live Camera Smoothing

For the live camera mode (frames captured every ~850 ms), the frontend applies
a **temporal smoothing buffer** over the last 4 predictions:

1. Accumulate breed probabilities across the buffer.
2. Average per-breed across all buffered frames.
3. Normalise to sum to 1.0.
4. Keep top-4 breeds.
5. Recompute `confidence` and `mixed_breed_likely` from smoothed probabilities.

This prevents rapid flickering between results when sequential frames produce
slightly different outputs.  The backend `/predict` endpoint is stateless and
identical for live-frame and upload requests.

---

## 14. Dataset Plan

| Phase | Action                                                              |
|-------|---------------------------------------------------------------------|
| 1     | Download Stanford Dogs dataset                                      |
| 2     | Download Oxford-IIIT Pet dataset                                    |
| 3     | Split Stanford Dogs 80/10/10 (train / val / test)                   |
| 4     | Run all training images through `FeatureExtractor` → prototype .npy |
| 5     | Train detector on Stanford Dogs bounding-box annotations            |
| 6     | Train backbone + classifier on breed labels                         |

---

## 15. Training Plan

```
Detector (YOLOv8n):
  Dataset:   Stanford Dogs bboxes + COCO dog images
  Epochs:    50
  Input:     640×640

Backbone (EfficientNet-B3 pretrained on ImageNet):
  Freeze backbone → train linear head (10 epochs)
  Unfreeze last 2 blocks → fine-tune (20 epochs)
  LR: 1e-3 → 1e-5 cosine schedule
  Batch: 32, image size: 224×224
  Augmentation: RandomHorizontalFlip, ColorJitter, RandomRotation(15°)

Classifier head:
  nn.Linear(1536 → 120)
  Cross-entropy loss with label smoothing 0.1

Calibration (post-training):
  Temperature scaling on held-out validation set
```

---

## 16. Evaluation Metrics

| Metric               | Target   | Notes                                   |
|----------------------|----------|-----------------------------------------|
| Top-1 accuracy       | ≥ 85 %   | Stanford Dogs test set (120 breeds)     |
| Top-5 accuracy       | ≥ 97 %   | Correct breed in top-5 predictions      |
| mAP (detector)       | ≥ 0.80   | IoU = 0.50 on held-out annotations      |
| Inference time       | ≤ 150 ms | Single image, CPU (M1/Intel i5 target)  |
| Confidence ECE       | ≤ 0.05   | Expected Calibration Error post-scaling |

---

## 17. API Response Format

```json
{
  "predictions": [
    {
      "breed": "Golden Retriever",
      "probability": 0.465,
      "classifier_score": 0.884,
      "similarity_score": 0.929
    },
    {
      "breed": "Labrador Retriever (Yellow)",
      "probability": 0.207,
      "classifier_score": 0.040,
      "similarity_score": 0.712
    }
  ],
  "mixed_breed_likely": true,
  "confidence": "high",
  "label": "Paw-sible breed mix",
  "dog_detected": true,
  "image_quality": "good",
  "quality_warnings": [],
  "inference_time_ms": 18,
  "model_version": "idogtify-algorithm-v1",
  "explanation": "Our dog breed analysis uses sophisticated AI algorithms..."
}
```

---

## 18. Current Mock vs Future Real Model

| Component          | Current (mock)                        | Future (real)                        |
|--------------------|---------------------------------------|--------------------------------------|
| Detector           | Brightness variance heuristic         | YOLOv8n fine-tuned on Stanford Dogs  |
| Feature extractor  | 28-d colour histogram                 | EfficientNet-B3 (1 536-d embedding)  |
| Classifier         | Colour-logit weight table + softmax   | Trained linear head (120 breeds)     |
| Breed prototypes   | Synthetic colour-patch embeddings     | Averaged real training image embeds  |
| Accuracy           | Colour-based approximation            | ≥ 85 % top-1 on Stanford Dogs        |

The API contract (`/predict` request/response shape) does **not** change.
Only the internals of `pipeline.py` and `feature_extractor.py` are replaced.

---

## 19. Limitations

- **No genetic information.** Probabilities reflect visual similarity only.
- **Background sensitivity.** Large backgrounds dilute breed signal.
- **Lighting dependency.** Dark or overexposed images reduce accuracy.
- **Angle sensitivity.** Profile/rear shots are harder than face-on photos.
- **Coat colour overlap.** Golden Retrievers and Yellow Labs share colour
  signatures; only a trained model distinguishes head shape and build.
- **Mixed breeds.** Novel mixes may not match any single prototype well,
  producing low-confidence results — which is the honest outcome.
- **Camera live mode.** Single-frame predictions vary; temporal smoothing in
  the frontend mitigates but does not eliminate flicker.

---

## 20. Future Improvements

- [ ] Train real EfficientNet-B3 classifier on Stanford Dogs
- [ ] Add YOLOv8n dog detector with tight bbox crop
- [ ] Build real prototype database from training image embeddings
- [ ] Expand to 120 Stanford Dogs breeds (currently 21 colour variants)
- [ ] FAISS index for fast similarity search at scale
- [ ] Per-breed confidence calibration (temperature scaling)
- [ ] Multi-dog support (crop and classify each detection)
- [ ] Breed trait overlay in the UI (ear shape, coat type, size)
- [ ] Segmentation-based foreground crop (Oxford-IIIT Pet masks)
- [ ] Export to ONNX for browser-side inference (privacy mode)
