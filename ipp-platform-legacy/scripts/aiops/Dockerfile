## AIOps Engine v2 — Multi-Agent Local LLM AIOps System
## Supports arm64 (Apple Silicon M-series) natively.
FROM python:3.12-slim-bookworm

WORKDIR /app

# Patch OS packages before installing app deps
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
ENV HOME=/tmp
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
