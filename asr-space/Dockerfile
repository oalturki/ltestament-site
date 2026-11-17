FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user HF_HOME=/home/user/.cache/huggingface PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
# the live model (open, Apache-2.0) is fetched while building, so the first reader does not wait for it
RUN python -c "from huggingface_hub import snapshot_download as d; d('tarteel-ai/whisper-base-ar-quran', allow_patterns=['*.json','*.txt','pytorch_model.bin','model.safetensors']); d('openai/whisper-base', allow_patterns=['*.json','*.txt'])"
COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
