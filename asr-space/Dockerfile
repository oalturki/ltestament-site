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
# the same model converted for CTranslate2 (int8): much faster on CPU; the tokenizer is Whisper's own (base)
RUN python -c "from ctranslate2.converters import TransformersConverter as T; T('tarteel-ai/whisper-base-ar-quran').convert('/home/user/ct2-whisper', quantization='int8', force=True)" \
 && python -c "from huggingface_hub import hf_hub_download as h; import shutil; [shutil.copy(h('openai/whisper-base', f), '/home/user/ct2-whisper/' + f) for f in ('tokenizer.json', 'preprocessor_config.json')]" \
 || (echo "CTranslate2 conversion failed: the service will use transformers" && rm -rf /home/user/ct2-whisper)
COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
