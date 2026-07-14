"""
LLM client — Anthropic Claude (cloud) with local Ollama fallback.

Provider selection (see get_llm_client()):
- If ANTHROPIC_API_KEY is set in the environment/.env, agents use Anthropic
  Claude directly via the Messages API.
- Otherwise, falls back to the local Ollama backend (unchanged behaviour).

Both backends expose the same interface (generate / generate_stream /
extract_json / model / _check_available) so callers (agents, manager, chat)
don't need to know which one is active.
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

import httpx

from .config import get_settings

logger = logging.getLogger("aiops.llm")

_RETRY_INTERVAL_S = 30.0

try:
    from anthropic import AsyncAnthropic
    _ANTHROPIC_SDK_AVAILABLE = True
except ImportError:
    AsyncAnthropic = None  # type: ignore[assignment,misc]
    _ANTHROPIC_SDK_AVAILABLE = False


@dataclass
class LLMResponse:
    text: str
    used_llm: bool
    model: str
    error: Optional[str] = None


def _configure_langsmith() -> str:
    cfg = get_settings()
    if cfg.langchain_tracing_v2 and cfg.langchain_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = cfg.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = cfg.langchain_project
        os.environ["LANGCHAIN_ENDPOINT"] = cfg.langchain_endpoint
        logger.info("LangSmith tracing enabled — project: %s", cfg.langchain_project)
        return "enabled"
    os.environ["LANGCHAIN_TRACING_V2"] = "false"
    return "disabled"


TRACING_STATUS = _configure_langsmith()


def _build_instruct_prompt(system_prompt: str, user_content: str) -> str:
    """Build llama3-instruct formatted prompt. Works with llama3.x, mistral, qwen2.5."""
    return (
        "<|begin_of_text|>"
        "<|start_header_id|>system<|end_header_id|>\n"
        f"{system_prompt}\n"
        "<|eot_id|>"
        "<|start_header_id|>user<|end_header_id|>\n"
        f"{user_content}\n"
        "<|eot_id|>"
        "<|start_header_id|>assistant<|end_header_id|>\n"
    )


def _extract_json_from_text(text: str) -> Optional[dict]:
    """Extract the first JSON object from an LLM response string."""
    for pattern in (r"```json\s*(.*?)```", r"```\s*(.*?)```"):
        m = re.search(pattern, text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except json.JSONDecodeError:
                pass

    start = text.find("{")
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return None


class OllamaLLMClient:
    """Async Ollama client with streaming support and graceful fallback."""

    provider = "ollama"

    def __init__(self) -> None:
        cfg = get_settings()
        # Prefer LOCAL_LLM_* vars; fall back to legacy ollama_* vars
        self._base_url = cfg.local_llm_base_url.rstrip("/") or cfg.ollama_base_url.rstrip("/")
        self._model = cfg.local_llm_model or cfg.ollama_model
        self._timeout = cfg.local_llm_timeout_seconds or cfg.llm_timeout
        self._max_tokens = cfg.local_llm_max_tokens
        self._temperature = cfg.local_llm_temperature
        self._max_retries = cfg.llm_max_retries
        self._enabled = cfg.local_llm_enabled
        self._available: Optional[bool] = None
        self._last_check: float = 0.0

    @property
    def model(self) -> str:
        return self._model

    @property
    def base_url(self) -> str:
        return self._base_url

    async def _check_available(self) -> bool:
        if not self._enabled:
            return False
        now = time.monotonic()
        if self._available is None or (not self._available and now - self._last_check > _RETRY_INTERVAL_S):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{self._base_url}/api/tags")
                    self._available = resp.status_code == 200
                    if self._available:
                        logger.info("Ollama reachable at %s — model %s", self._base_url, self._model)
            except Exception as exc:
                logger.debug("Ollama unreachable: %s", exc)
                self._available = False
            self._last_check = now
        return bool(self._available)

    async def generate(self, system_prompt: str, user_content: str) -> LLMResponse:
        """Non-streaming generate — used for agent JSON responses."""
        if not await self._check_available():
            return LLMResponse(
                text="", used_llm=False, model="rule-based",
                error="LLM unreachable — using rule-based fallback.",
            )

        full_prompt = _build_instruct_prompt(system_prompt, user_content)
        payload = {
            "model": self._model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.05,           # very low for deterministic JSON
                "num_predict": 768,            # enough for structured agent JSON
                "stop": ["<|eot_id|>"],
            },
        }

        for attempt in range(self._max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(f"{self._base_url}/api/generate", json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    text = data.get("response", "").strip()
                    logger.debug("LLM response (%d chars): %s…", len(text), text[:120])
                    return LLMResponse(text=text, used_llm=True, model=self._model)
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                if attempt == self._max_retries:
                    logger.warning("LLM timed out after %d attempts — fallback", attempt + 1)
                    self._available = False
                    self._last_check = time.monotonic()
                    return LLMResponse(
                        text="", used_llm=False, model="rule-based",
                        error=f"LLM timeout: {exc}",
                    )
                await asyncio.sleep(0.5 * (attempt + 1))
            except Exception as exc:
                logger.warning("LLM error: %s", exc)
                return LLMResponse(text="", used_llm=False, model="rule-based", error=str(exc))

        return LLMResponse(text="", used_llm=False, model="rule-based")

    async def generate_stream(
        self,
        system_prompt: str,
        user_content: str,
    ) -> AsyncIterator[str]:
        """
        Streaming generate — yields text tokens as they arrive from Ollama.
        Uses LOCAL_LLM_TEMPERATURE and LOCAL_LLM_MAX_TOKENS.
        If LLM unavailable, yields nothing (caller uses deterministic fallback).
        """
        if not await self._check_available():
            return

        full_prompt = _build_instruct_prompt(system_prompt, user_content)
        payload = {
            "model": self._model,
            "prompt": full_prompt,
            "stream": True,
            "options": {
                "temperature": self._temperature,  # 0.1 for operational consistency
                "num_predict": self._max_tokens,
                "stop": ["<|eot_id|>"],
            },
        }

        # Granular timeout: fast connect, moderate per-chunk read so a stalled
        # Ollama generation (e.g. model cold-start) fails at 25 s instead of
        # blocking the SSE stream for the full self._timeout (60 s).
        stream_timeout = httpx.Timeout(connect=5.0, read=25.0, write=5.0, pool=5.0)
        try:
            async with httpx.AsyncClient(timeout=stream_timeout) as client:
                async with client.stream(
                    "POST", f"{self._base_url}/api/generate", json=payload
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            logger.warning("LLM stream timeout: %s — no more tokens", exc)
            self._available = False
            self._last_check = time.monotonic()
        except Exception as exc:
            logger.warning("LLM stream error: %s", exc)

    def extract_json(self, text: str) -> Optional[dict]:
        return _extract_json_from_text(text)


# Backward-compatible alias — existing imports/tests refer to LLMClient.
LLMClient = OllamaLLMClient


class AnthropicLLMClient:
    """
    Async Anthropic Claude client — selected automatically by get_llm_client()
    when ANTHROPIC_API_KEY is present. Mirrors OllamaLLMClient's interface so
    agents/manager/chat code works unchanged regardless of active provider.
    """

    provider = "anthropic"

    def __init__(self) -> None:
        cfg = get_settings()
        self._model = cfg.anthropic_model
        self._max_tokens = cfg.anthropic_max_tokens
        self._client = AsyncAnthropic(
            api_key=cfg.anthropic_api_key,
            timeout=cfg.anthropic_timeout_seconds,
        )

    @property
    def model(self) -> str:
        return self._model

    @property
    def base_url(self) -> str:
        return "https://api.anthropic.com"

    async def _check_available(self) -> bool:
        # Presence of a configured client (API key) is sufficient — the
        # Messages API call itself will surface auth/connectivity errors.
        return True

    @staticmethod
    def _cached_system(system_prompt: str) -> list:
        """
        Wrap the (static, per-agent) system prompt as a cached content block.
        Each agent/manager/chat prompt is called repeatedly with an identical
        system prompt across a demo session — prompt caching means only the
        first call in a 5-minute window pays full input-token price for it.
        """
        return [{
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"},
        }]

    async def generate(self, system_prompt: str, user_content: str) -> LLMResponse:
        """Non-streaming generate — used for agent JSON responses."""
        try:
            resp = await self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                # `temperature` is deprecated/rejected (HTTP 400) by the Claude 5
                # model family — omit it and rely on the model's default sampling.
                system=self._cached_system(system_prompt),
                messages=[{"role": "user", "content": user_content}],
            )
            text = "".join(
                block.text for block in resp.content if getattr(block, "type", None) == "text"
            ).strip()
            logger.debug("Anthropic response (%d chars): %s…", len(text), text[:120])
            return LLMResponse(text=text, used_llm=True, model=self._model)
        except Exception as exc:
            logger.warning("Anthropic API error: %s", exc)
            return LLMResponse(
                text="", used_llm=False, model="rule-based",
                error=f"Anthropic API error: {exc}",
            )

    async def generate_stream(
        self,
        system_prompt: str,
        user_content: str,
    ) -> AsyncIterator[str]:
        """Streaming generate — yields text tokens as they arrive from Claude."""
        try:
            async with self._client.messages.stream(
                model=self._model,
                max_tokens=self._max_tokens,
                system=self._cached_system(system_prompt),
                messages=[{"role": "user", "content": user_content}],
            ) as stream:
                async for token in stream.text_stream:
                    if token:
                        yield token
        except Exception as exc:
            logger.warning("Anthropic stream error: %s — no more tokens", exc)

    def extract_json(self, text: str) -> Optional[dict]:
        return _extract_json_from_text(text)


_client: Optional[object] = None


def get_llm_client():
    """
    Return the process-wide singleton LLM client.

    Anthropic Claude is used when ANTHROPIC_ENABLED is true (default) AND
    ANTHROPIC_API_KEY is configured — this takes priority over the local
    Ollama backend so response quality doesn't depend on a locally running
    model. Set ANTHROPIC_ENABLED=false to force local Ollama even with a key
    configured (see `make aiops-use-local` / `make aiops-use-claude`). The
    local LLM path is left fully intact and is used automatically whenever
    Anthropic is disabled, unconfigured, or the `anthropic` package is missing.
    """
    global _client
    if _client is None:
        cfg = get_settings()
        if cfg.anthropic_enabled and cfg.anthropic_api_key and _ANTHROPIC_SDK_AVAILABLE:
            logger.info(
                "ANTHROPIC_ENABLED=true and ANTHROPIC_API_KEY set — using Anthropic Claude (%s) for AIOps LLM synthesis",
                cfg.anthropic_model,
            )
            _client = AnthropicLLMClient()
        else:
            if not cfg.anthropic_enabled and cfg.anthropic_api_key:
                logger.info("ANTHROPIC_ENABLED=false — using local Ollama LLM (Anthropic key is configured but disabled)")
            elif cfg.anthropic_api_key and not _ANTHROPIC_SDK_AVAILABLE:
                logger.warning(
                    "ANTHROPIC_API_KEY is set but the 'anthropic' package is not installed — "
                    "falling back to local Ollama LLM. Run: pip install anthropic"
                )
            _client = OllamaLLMClient()
    return _client
