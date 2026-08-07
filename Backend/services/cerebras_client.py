"""Shared LLM client with Cerebras ↔ Groq automatic failover.

Order (default): try Cerebras first; if it fails, try Groq.
Set LLM_PRIMARY=groq to reverse the order.

Env keys:
  CEREBRAS_API_KEY  → Cerebras (csk-…)
  GROQ_API_KEY      → Groq (gsk-…)
  CEREBRAS_MODEL / GROQ_MODEL / LLM_PRIMARY → optional overrides
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)

CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

DEFAULT_CEREBRAS_MODEL = "gpt-oss-120b"
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def get_cerebras_key() -> str:
    if has_app_context():
        key = (current_app.config.get("CEREBRAS_API_KEY") or "").strip()
        if key:
            return key
    return (os.getenv("CEREBRAS_API_KEY") or "").strip()


def get_groq_key() -> str:
    if has_app_context():
        key = (current_app.config.get("GROQ_API_KEY") or "").strip()
        if key:
            return key
    return (os.getenv("GROQ_API_KEY") or "").strip()


def has_llm_key() -> bool:
    """True when CEREBRAS_API_KEY and/or GROQ_API_KEY is set."""
    return bool(get_cerebras_key() or get_groq_key())


def _openai_client(api_key: str, base_url: Optional[str] = None) -> Any:
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise RuntimeError(
            "openai package is required. Install it with: pip install openai"
        ) from exc

    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    return OpenAI(api_key=api_key)


def _cerebras_provider() -> Optional[dict[str, Any]]:
    api_key = get_cerebras_key()
    if not api_key:
        return None

    if api_key.startswith("csk-"):
        return {
            "name": "cerebras",
            "client": _openai_client(api_key, CEREBRAS_BASE_URL),
            "model": (
                (os.getenv("CEREBRAS_MODEL") or "").strip()
                or DEFAULT_CEREBRAS_MODEL
            ),
            "reasoning_effort": "low",
        }

    # Non-csk key in CEREBRAS_API_KEY still routed to Cerebras endpoint.
    return {
        "name": "cerebras",
        "client": _openai_client(api_key, CEREBRAS_BASE_URL),
        "model": (os.getenv("CEREBRAS_MODEL") or "").strip() or DEFAULT_CEREBRAS_MODEL,
        "reasoning_effort": None,
    }


def _groq_provider() -> Optional[dict[str, Any]]:
    api_key = get_groq_key()
    if not api_key:
        return None
    return {
        "name": "groq",
        "client": _openai_client(api_key, GROQ_BASE_URL),
        "model": (os.getenv("GROQ_MODEL") or "").strip() or DEFAULT_GROQ_MODEL,
        "reasoning_effort": None,
    }


def _provider_chain() -> list[dict[str, Any]]:
    """Build try-order: primary then backup (whichever keys are present)."""
    cerebras = _cerebras_provider()
    groq = _groq_provider()
    primary = (os.getenv("LLM_PRIMARY") or "cerebras").strip().lower()

    if primary == "groq":
        ordered = [groq, cerebras]
    else:
        ordered = [cerebras, groq]

    return [provider for provider in ordered if provider is not None]


def get_chat_client_and_model() -> tuple[Any, str]:
    """Return the primary available (client, model). Prefer failover via chat_completion."""
    chain = _provider_chain()
    if not chain:
        raise RuntimeError(
            "No LLM API key set. Add CEREBRAS_API_KEY and/or GROQ_API_KEY to Backend/.env."
        )
    provider = chain[0]
    return provider["client"], provider["model"]


def _extract_text(message: Any) -> str:
    if message is None:
        return ""

    content = getattr(message, "content", None)
    if isinstance(content, str) and content.strip():
        return content.strip()

    reasoning = getattr(message, "reasoning", None)
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning.strip()

    if hasattr(message, "model_dump"):
        data = message.model_dump()
        for key in ("content", "reasoning"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return ""


def _call_provider(
    provider: dict[str, Any],
    *,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    create_kwargs: dict[str, Any] = {
        "model": provider["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    effort = provider.get("reasoning_effort")
    if effort and "gpt-oss" in str(provider["model"]):
        create_kwargs["reasoning_effort"] = effort

    response = provider["client"].chat.completions.create(**create_kwargs)
    return _extract_text(response.choices[0].message)


def chat_completion(
    *,
    messages: list[dict[str, str]],
    temperature: float = 0,
    max_tokens: int = 512,
) -> str:
    """Run chat completion with Cerebras ↔ Groq failover."""
    chain = _provider_chain()
    if not chain:
        raise RuntimeError(
            "No LLM API key set. Add CEREBRAS_API_KEY and/or GROQ_API_KEY to Backend/.env."
        )

    errors: list[str] = []
    for index, provider in enumerate(chain):
        name = provider["name"]
        try:
            text = _call_provider(
                provider,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if index > 0:
                logger.info("LLM failover succeeded via %s", name)
            else:
                logger.debug("LLM call succeeded via %s", name)
            return text
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: {exc}")
            next_provider = chain[index + 1]["name"] if index + 1 < len(chain) else None
            if next_provider:
                logger.warning(
                    "LLM provider %s failed (%s); trying backup %s",
                    name,
                    exc,
                    next_provider,
                )
            else:
                logger.warning("LLM provider %s failed (%s); no backup left", name, exc)

    raise RuntimeError(
        "All LLM providers failed. " + " | ".join(errors)
    )
