"""Somali explanation phrasing via Gemini with live Google Search grounding.

Gemini ONLY rephrases verdicts that the trained models already decided.
It must never invent new medical judgments or diagnoses.

Search grounding requires a billed Gemini API key. When grounding returns
no real URLs, we fall back to curated Ministry of Health / WHO links —
never invent or hallucinate URLs.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 25

# Banned org names in generated TEXT (Somali-first policy). Grounded URLs
# may still be legitimate; this only filters what the Somali message says.
_BANNED_TEXT_PATTERNS = (
    re.compile(r"\bFDA\b", re.IGNORECASE),
    re.compile(r"\bCDC\b", re.IGNORECASE),
    re.compile(r"\bMayo Clinic\b", re.IGNORECASE),
    re.compile(r"\bNHS\b", re.IGNORECASE),
)

# Curated fallback URLs when grounding_metadata is empty.
CURATED_SOURCES: list[dict[str, str]] = [
    {
        "title": "World Health Organization",
        "url": "https://www.who.int/",
    },
    {
        "title": "WHO EMRO — Somalia",
        "url": "https://www.emro.who.int/countries/som/index.html",
    },
    {
        "title": "Somalia Ministry of Health",
        "url": "https://moh.gov.so/",
    },
]

_STATIC_UNRELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Non-Reliable. Fadlan ka hubi ilo "
    "rasmi ah sida WHO iyo Wasaaradda Caafimaadka Soomaaliya."
)

_STATIC_RELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Reliable."
)


def _curated_sources() -> list[dict[str, str]]:
    return [dict(item) for item in CURATED_SOURCES]


def _static_unreliable(claim_text: str = "") -> str:
    _ = claim_text
    return (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Non-Reliable. "
        "Fadlan ka hubi ilo rasmi ah sida WHO iyo Wasaaradda "
        "Caafimaadka Soomaaliya (moh.gov.so)."
    )


def _static_reliable(claim_text: str = "") -> str:
    _ = claim_text
    return _STATIC_RELIABLE


def validate_generated_message(message: str) -> bool:
    """Text-level safety check on Gemini's Somali message body.

    Returns False if the message mentions disallowed org names (e.g. FDA)
    that we do not want surfaced in Somali user-facing copy, even when
    grounded search URLs themselves are legitimate.
    """
    text = (message or "").strip()
    if not text:
        return False
    for pattern in _BANNED_TEXT_PATTERNS:
        if pattern.search(text):
            logger.info(
                "validate_generated_message rejected banned term: %s",
                pattern.pattern,
            )
            return False
    return True


def _get_api_key() -> str:
    if has_app_context():
        return (current_app.config.get("GEMINI_API_KEY") or "").strip()
    import os

    return (os.getenv("GEMINI_API_KEY") or "").strip()


def _get_client():
    """Return a google.genai Client configured for search grounding."""
    api_key = _get_api_key()
    if not api_key:
        return None

    try:
        from google import genai

        return genai.Client(api_key=api_key)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini client setup failed: %s", exc)
        return None


def _extract_grounding_sources(response: Any) -> list[dict[str, str]]:
    """Pull real URLs/titles from grounding_metadata.grounding_chunks."""
    sources: list[dict[str, str]] = []
    seen: set[str] = set()

    try:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return []

        metadata = getattr(candidates[0], "grounding_metadata", None)
        if metadata is None:
            return []

        chunks = getattr(metadata, "grounding_chunks", None) or []
        for chunk in chunks:
            web = getattr(chunk, "web", None)
            if web is None:
                continue
            url = (getattr(web, "uri", None) or getattr(web, "url", None) or "").strip()
            title = (getattr(web, "title", None) or "").strip() or url
            if not url or url in seen:
                continue
            seen.add(url)
            sources.append({"title": title, "url": url})
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to extract grounding_metadata: %s", exc)
        return []

    return sources


# Prefer current flash models. Search grounding needs a billed Gemini key;
# free-tier keys typically return 429 (quota limit 0) for generate_content.
_GEMINI_MODELS = (
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
)


def _generate_with_grounding(
    prompt: str,
) -> tuple[Optional[str], list[dict[str, str]], Any]:
    """Call Gemini with Google Search grounding via the google.genai SDK.

    Equivalent to enabling tools=[{"google_search": {}}] on generate_content.
    Returns (message_text|None, grounding_sources, raw_response|None).
    """
    client = _get_client()
    if client is None:
        return None, [], None

    try:
        from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
        from google.genai import types

        last_error: Optional[BaseException] = None

        for model_name in _GEMINI_MODELS:

            def _call(name: str = model_name):
                return client.models.generate_content(
                    model=name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[types.Tool(google_search=types.GoogleSearch())],
                    ),
                )

            try:
                with ThreadPoolExecutor(max_workers=1) as pool:
                    future = pool.submit(_call)
                    response = future.result(timeout=REQUEST_TIMEOUT_SECONDS)

                text = (getattr(response, "text", None) or "").strip()
                sources = _extract_grounding_sources(response)
                logger.info(
                    "Gemini grounded call ok model=%s grounding_chunks=%s",
                    model_name,
                    len(sources),
                )
                return (text or None), sources, response
            except FuturesTimeout:
                logger.warning(
                    "Gemini grounded generate_content timed out after %ss (model=%s)",
                    REQUEST_TIMEOUT_SECONDS,
                    model_name,
                )
                return None, [], None
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning(
                    "Gemini grounded generate_content failed model=%s: %s",
                    model_name,
                    exc,
                )
                continue

        if last_error is not None:
            logger.warning(
                "All Gemini grounded models failed; last error: %s",
                last_error,
            )
        return None, [], None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini grounded generate_content failed: %s", exc)
        return None, [], None


def _finalize_explanation(
    *,
    message: Optional[str],
    grounded_sources: list[dict[str, str]],
    static_message: str,
) -> dict[str, Any]:
    """Apply text validation + source fallback rules."""
    if message and validate_generated_message(message):
        final_message = message
    else:
        if message:
            logger.info("Falling back to static message after validation failure.")
        final_message = static_message

    if grounded_sources:
        sources = grounded_sources
    else:
        logger.info(
            "grounding_metadata empty — using curated MoH/WHO fallback sources"
        )
        sources = _curated_sources()

    return {"message": final_message, "sources": sources}


def generate_unreliable_explanation(claim_text: str) -> dict[str, Any]:
    """Phrase a Non-Reliable verdict with live grounded search sources.

    Uses Gemini Google Search grounding to find real URLs related to the
    claim. Prefer moh.gov.so, who.int, emro.who.int, and official MoH/WHO
    pages when available. If grounding returns nothing, fall back to
    curated Ministry of Health / WHO links.
    """
    claim = (claim_text or "").strip()

    prompt = f"""You are a careful Somali-language health communication assistant for SomAI.

You MUST use Google Search to find REAL, CURRENT Somali health information
related to this claim. Prioritize official sources:
- moh.gov.so (Somalia Ministry of Health)
- who.int
- emro.who.int
- Official Somali Ministry of Health or WHO Facebook pages

You may include other real, relevant results if those official pages do not
cover the claim. NEVER invent or fabricate URLs.

STRICT RULES:
1. The trained classifier already decided this claim is Non-Reliable.
   Do NOT reverse that decision or invent a new medical judgment.
2. Write ONLY in Somali (Af-Soomaali), 2–3 short sentences.
3. Thank the user, state the claim appears Non-Reliable, and point them to
   trustworthy official sources (without inventing URLs in the text).
4. Do NOT invent treatments, diagnoses, or dosages.
5. Do NOT claim the claim is Reliable.
6. Do NOT mention FDA, CDC, Mayo Clinic, or NHS in the Somali text.
7. Output plain Somali text only — no markdown, no bullet lists, no English,
   no URL list in the message body (sources are attached separately).

Classifier result: Non-Reliable (final).
User claim:
{claim}

Write the Somali explanation now, after searching."""

    text, grounded, _raw = _generate_with_grounding(prompt)
    return _finalize_explanation(
        message=text,
        grounded_sources=grounded,
        static_message=_static_unreliable(claim),
    )


def generate_reliable_explanation(claim_text: str) -> dict[str, Any]:
    """Phrase a Reliable verdict; ground-search for a supporting real source."""
    claim = (claim_text or "").strip()

    prompt = f"""You are a careful Somali-language health communication assistant for SomAI.

You MUST use Google Search to find a REAL, CURRENT source that supports this
evidence-based health claim. Prioritize official sources:
- moh.gov.so (Somalia Ministry of Health)
- who.int
- emro.who.int
- Official Somali Ministry of Health or WHO Facebook pages

You may include other real, relevant supporting results if needed.
NEVER invent or fabricate URLs.

STRICT RULES:
1. The trained classifier already decided this claim is Reliable.
   Do NOT reverse that decision or invent a new medical judgment.
2. Write ONLY in Somali (Af-Soomaali), 2–3 short sentences.
3. Thank the user and state the claim appears Reliable / evidence-based.
4. Do NOT invent treatments, diagnoses, or dosages beyond restating the
   classifier result.
5. Do NOT claim the claim is Non-Reliable.
6. Do NOT mention FDA, CDC, Mayo Clinic, or NHS in the Somali text.
7. Output plain Somali text only — no markdown, no bullet lists, no English,
   no URL list in the message body (sources are attached separately).

Classifier result: Reliable (final).
User claim:
{claim}

Write the Somali explanation now, after searching."""

    text, grounded, _raw = _generate_with_grounding(prompt)
    return _finalize_explanation(
        message=text,
        grounded_sources=grounded,
        static_message=_static_reliable(claim),
    )
