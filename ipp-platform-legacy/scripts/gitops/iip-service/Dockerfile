FROM python:3.12-slim

WORKDIR /app

# Install conftest
ARG CONFTEST_VERSION=0.53.0
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -sL "https://github.com/open-policy-agent/conftest/releases/download/v${CONFTEST_VERSION}/conftest_${CONFTEST_VERSION}_Linux_arm64.tar.gz" \
      | tar xz conftest && \
    mv conftest /usr/local/bin/ && \
    apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Policy dir — mounted at runtime from ConfigMap or baked in
RUN mkdir -p /app/policy

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
