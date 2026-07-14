"""
Redaction utility — strips secrets and sensitive values from agent outputs
before they are returned via the API.
"""
import re
from typing import Any

# Patterns that indicate a value should be redacted
_REDACT_KEYS = re.compile(
    r"(password|passwd|secret|token|api[_-]?key|auth|credential|private[_-]?key"
    r"|access[_-]?key|authorization|bearer|connection[_-]?string|dsn|smtp)",
    re.IGNORECASE,
)

_SECRET_VALUE_PATTERNS = [
    re.compile(r"[A-Za-z0-9+/]{40,}={0,2}"),          # base64-ish strings
    re.compile(r"eyJ[A-Za-z0-9._-]{20,}"),             # JWT
    re.compile(r"ghp_[A-Za-z0-9]{36}"),                # GitHub PAT
    re.compile(r"sk-[A-Za-z0-9]{32,}"),                # OpenAI-style key
    re.compile(r"[A-Za-z0-9]{32,}@[a-z0-9.-]+:\d+"),  # connection string fragments
]

_REDACTED = "[REDACTED]"


def redact_value(value: str) -> str:
    """Redact obviously sensitive patterns from a string value."""
    for pattern in _SECRET_VALUE_PATTERNS:
        value = pattern.sub(_REDACTED, value)
    return value


def redact_dict(obj: Any, depth: int = 0) -> Any:
    """
    Recursively walk a dict/list/str and redact sensitive values.
    Stops at depth 20 to prevent pathological input.
    """
    if depth > 20:
        return obj
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if _REDACT_KEYS.search(str(k)):
                result[k] = _REDACTED
            else:
                result[k] = redact_dict(v, depth + 1)
        return result
    if isinstance(obj, list):
        return [redact_dict(item, depth + 1) for item in obj]
    if isinstance(obj, str):
        return redact_value(obj)
    return obj
