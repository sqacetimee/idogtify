FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libglib2.0-0 libsm6 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (~700 MB vs ~2 GB for full)
RUN pip install --no-cache-dir \
    torch==2.12.0 torchvision==0.27.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies (pip skips torch since it's already installed)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# HuggingFace Spaces default port
ENV PORT=7860
EXPOSE 7860

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
