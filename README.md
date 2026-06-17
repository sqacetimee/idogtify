# iDogtify 🐾

**AI-powered dog breed identification** — upload a photo or scan live with your camera and get an answer in under a second.

**[Live Demo → idogtify.vercel.app](https://idogtify.vercel.app)**

---

## What it does

iDogtify uses a fine-tuned ConvNeXt-Small model to identify dog breeds from photos and live camera. It analyses visual features — ear shape, muzzle length, coat texture, body proportions — and matches them against 120 breeds. Mixed-breed dogs get a probability spread across the top matches instead of a single forced answer.

--- 

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| ML Model | ConvNeXt-Small (`convnext_small.fb_in22k_ft_in1k`) via timm |
| Pretraining | ImageNet-21k (21,000 classes) |
| Fine-tuning | Stanford Dogs dataset (120 breeds) |
| Inference | PyTorch CPU |
| Database | SQLite — 120-breed metadata (descriptions, temperament, origin, fun facts) |
| Deployment | Vercel (frontend) · HuggingFace Spaces Docker (backend) · HuggingFace Hub (weights) |

---

## Model 

- **Architecture**: ConvNeXt-Small pretrained on ImageNet-21k, fine-tuned on Stanford Dogs
- **Training strategy**: Two-phase — frozen backbone linear probe, then full fine-tune with differential learning rates (backbone 5e-6, head 5e-5) and label smoothing
- **Accuracy**: **90.9% top-1** on Stanford Dogs validation set
- **Prediction**: Hybrid scorer combining classifier probability (90%) and embedding similarity (10%)
- **Hosting**: Weights stored on HuggingFace Hub, downloaded automatically on Space startup

---

## Features

- Upload mode with drag-and-drop
- Live camera scanning — auto-locks once a high-confidence match is found
- Mixed-breed detection with probability distribution
- 120-breed database with metadata shown on each prediction
- Scout mascot with state-driven animations (tap to bark)
- Responsive across mobile and desktop

---

## Project structure

```
idogtify/
├── frontend/                  # Next.js app (deployed to Vercel)
│   ├── app/
│   │   ├── components/        # UI components
│   │   ├── lib/               # API client, prediction logic
│   │   └── types/             # TypeScript interfaces
│   └── public/                # Static assets
│
└── backend/                   # FastAPI service (deployed to HuggingFace Spaces)
    ├── app/
    │   ├── api/               # Prediction route
    │   ├── db/                # SQLAlchemy models + 120-breed seeder
    │   ├── ml/                # Classifier, scorer, pipeline, confidence
    │   └── models/            # Pydantic schemas
    ├── scripts/
    │   ├── train.py           # Fine-tune ConvNeXt-Small on Stanford Dogs
    │   ├── collect_breeds.py  # Download training images for new breeds
    │   └── upload_model.py    # Push model weights to HuggingFace Hub
    ├── Dockerfile
    └── requirements.txt
```

---

## Running locally

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 in .env.local
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend seeds the 120-breed database automatically on first startup.

### Train the model (optional — weights are on HuggingFace Hub)

```bash
cd backend
python scripts/train.py           # ~15 min Phase 1 on CPU, reaches 90.9%
python scripts/upload_model.py    # push weights to HuggingFace Hub
```

---

## Deployment

| Service | Config |
|---------|--------|
| Vercel | Set `NEXT_PUBLIC_BACKEND_URL` to your HuggingFace Space URL |
| HuggingFace Spaces | Docker, `app_port: 7860` — set `HF_MODEL_REPO` env var to your Hub repo |
| HuggingFace Hub | Model weights auto-downloaded on Space startup |

---

## Limitations

The model is trained on the Stanford Dogs dataset (120 AKC-recognized breeds). Designer and hybrid breeds (Goldendoodle, Labradoodle, American Pocket Bully, etc.) are not in the training data — they will match to the closest recognized breed instead.

---

*Built as an MLE portfolio project. First-year CS student.*
