"""
Central configuration for the AIOps multi-agent system.
All values are read from environment variables with safe defaults.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Service URLs ────────────────────────────────────────────────────────
    prometheus_url: str = "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090"
    argocd_url: str = "http://argocd-server.argocd.svc.cluster.local:80"
    argocd_auth_token: str = ""          # populated from aiops-secrets → ARGOCD_AUTH_TOKEN
    opencost_url: str = "http://opencost.opencost.svc.cluster.local:9090"
    hubble_url: str = "http://hubble-relay.kube-system.svc.cluster.local:4245"
    spire_server_url: str = "http://spire-server.spire.svc.cluster.local:8081"

    # ── Anthropic (cloud LLM — takes priority over local Ollama when set) ──
    # ANTHROPIC_ENABLED is the on/off switch: the API key can stay configured
    # permanently while this flag is flipped to move between providers without
    # touching secrets — see `make aiops-use-claude` / `make aiops-use-local`.
    anthropic_enabled: bool = True
    anthropic_api_key: str = ""               # ANTHROPIC_API_KEY — if set (and enabled), agents use Claude
    anthropic_model: str = "claude-sonnet-5"
    anthropic_max_tokens: int = 4096
    anthropic_timeout_seconds: float = 60.0

    # ── Local LLM ───────────────────────────────────────────────────────────
    local_llm_enabled: bool = True
    local_llm_provider: str = "ollama"        # ollama | lmstudio | llamacpp
    local_llm_base_url: str = "http://host.docker.internal:11434"
    local_llm_model: str = "llama3.1:8b"
    local_llm_timeout_seconds: float = 60.0
    local_llm_max_tokens: int = 4096
    local_llm_temperature: float = 0.1       # low temp → operational consistency

    # Legacy aliases kept for backward compatibility
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "llama3.1:8b"
    aiops_agent_mode: str = "local"           # local | fallback
    llm_timeout: float = 90.0
    llm_max_retries: int = 1

    # ── Chat ────────────────────────────────────────────────────────────────
    chat_history_max: int = 50               # max messages per conversation
    chat_stream_keepalive_s: float = 15.0   # SSE keepalive interval

    # ── LangSmith (optional tracing) ────────────────────────────────────────
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "idp-aiops-demo"
    langchain_endpoint: str = "https://api.smith.langchain.com"

    # ── CORS ────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins. Defaults to Backstage local URL.
    # Set CORS_ALLOWED_ORIGINS=* only for isolated local demo environments.
    cors_allowed_origins: str = "http://backstage.ipp.local,http://localhost:3000,http://localhost:7007"

    # ── Application ─────────────────────────────────────────────────────────
    app_version: str = "2.0.0"
    http_timeout: float = 5.0
    log_level: str = "INFO"
    analysis_cache_ttl: int = 300             # seconds to cache last analysis


@lru_cache
def get_settings() -> Settings:
    return Settings()
