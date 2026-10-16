"""Structured logging configuration with secret redaction."""

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict


# Regex patterns for sensitive data redaction
REDACTION_PATTERNS = [
    (re.compile(r'(?i)(bearer\s+)([A-Za-z0-9_\-\.]{10,})'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(api[_-]?key["\']?\s*[:=]\s*["\']?)([^"\'\s,}{]+)'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(password["\']?\s*[:=]\s*["\']?)([^"\'\s,}{]+)'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(secret[_-]?key["\']?\s*[:=]\s*["\']?)([^"\'\s,}{]+)'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(authorization["\']?\s*[:=]\s*["\']?)([^"\'\s,}{]+)'), r'\1[REDACTED]'),
    (re.compile(r'(?i)(token["\']?\s*[:=]\s*["\']?)([^"\'\s,}{]+)'), r'\1[REDACTED]'),
]


def redact_sensitive_string(text: str) -> str:
    """Mask sensitive tokens, passwords, and API keys in strings."""
    if not isinstance(text, str):
        return text
    redacted = text
    for pattern, replacement in REDACTION_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted


def redact_sensitive_data(data: Any) -> Any:
    """Recursively redact dictionary and list structures."""
    sensitive_keys = {
        "password",
        "api_key",
        "secret_key",
        "token",
        "access_token",
        "authorization",
        "secret",
        "phonepilot_api_key",
        "phonepilot_secret_key",
    }
    if isinstance(data, dict):
        cleaned: Dict[str, Any] = {}
        for k, v in data.items():
            if any(s in str(k).lower() for s in sensitive_keys):
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = redact_sensitive_data(v)
        return cleaned
    if isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    if isinstance(data, str):
        return redact_sensitive_string(data)
    return data


class RedactingJsonFormatter(logging.Formatter):
    """JSON logging formatter that automatically redacts sensitive information."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_sensitive_string(record.getMessage()),
        }

        # Extra structured data attached to record
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_entry["extra"] = redact_sensitive_data(record.extra_data)

        if record.exc_info:
            exc_text = self.formatException(record.exc_info)
            log_entry["exception"] = redact_sensitive_string(exc_text)

        return json.dumps(log_entry)


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure root logger with redacting JSON formatter."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers
    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(RedactingJsonFormatter())
        root.addHandler(handler)
    else:
        for h in root.handlers:
            h.setFormatter(RedactingJsonFormatter())
            h.setLevel(level)

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.INFO)

    logger = logging.getLogger("phonepilot")
    logger.setLevel(level)
    return logger
