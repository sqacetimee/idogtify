"""
Upload the trained model to HuggingFace Hub so the deployed backend
can download it automatically on startup.

Run once after training:
    python upload_model.py

Requirements:
    pip install huggingface_hub
    huggingface-cli login   (or set HF_TOKEN env var)

After uploading, set this env var in Railway / HuggingFace Spaces:
    HF_MODEL_REPO=your-username/idogtify-model
"""

import os
import sys

MODEL_PATH = "app/ml/models/dog_breed_classifier.pth"

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: {MODEL_PATH} not found.")
    print("Run python train.py first to produce the model file.")
    sys.exit(1)

try:
    from huggingface_hub import HfApi
except ImportError:
    print("ERROR: huggingface_hub not installed. Run: pip install huggingface_hub")
    sys.exit(1)

username = input("Your HuggingFace username: ").strip()
repo_name = input("Repository name [idogtify-model]: ").strip() or "idogtify-model"
repo_id = f"{username}/{repo_name}"

api = HfApi()

print(f"\nCreating repository {repo_id} …")
api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True, private=False)

print(f"Uploading {MODEL_PATH} …")
api.upload_file(
    path_or_fileobj=MODEL_PATH,
    path_in_repo="dog_breed_classifier.pth",
    repo_id=repo_id,
    repo_type="model",
)

print(f"\n✓ Upload complete: https://huggingface.co/{repo_id}")
print(f"\nSet this environment variable in your deployment:")
print(f"  HF_MODEL_REPO={repo_id}")
