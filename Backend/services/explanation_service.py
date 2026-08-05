"""Somali explanation phrasing via Google Gemini (free tier).

Gemini ONLY rephrases verdicts that the trained models already decided.
It must never invent new medical judgments or diagnoses.

`category` is produced by keyword matching (infer_topic_category), not by
a trained topic classifier (SomBERTb Task B was removed).
"""

from __future__ import annotations

import logging
from typing import Optional

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 10

# Trusted sources Gemini may cite for Non-Reliable explanations, by category.
TRUSTED_RESOURCES_BY_CATEGORY: dict[str, tuple[str, ...]] = {
    "Medication Advice": (
        "WHO Essential Medicines",
        "FDA",
        "Mayo Clinic",
        "NHS Medicines A-Z",
    ),
    "Prevention Advice": (
        "WHO",
        "CDC",
        "UNICEF",
        "NHS Vaccinations",
    ),
    "Lifestyle Advice": (
        "WHO Healthy Diet",
        "CDC Physical Activity",
        "Mayo Clinic",
        "NHS Live Well",
    ),
    "Mental Health Advice": (
        "WHO Mental Health",
        "CDC Mental Health",
        "NHS Mental Health",
        "Mayo Clinic",
    ),
    "General Health Advice": (
        "WHO",
        "CDC",
        "Mayo Clinic",
        "NHS",
        "UNICEF",
    ),
}

_STATIC_UNRELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Non-Reliable. Fadlan ka hubi ilo "
    "la aamini karo sida WHO ama Mayo Clinic."
)

_STATIC_RELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Reliable."
)


def _trusted_for(category: Optional[str]) -> tuple[str, ...]:
    key = (category or "General Health Advice").strip()
    return TRUSTED_RESOURCES_BY_CATEGORY.get(
        key,
        TRUSTED_RESOURCES_BY_CATEGORY["General Health Advice"],
    )


def _static_unreliable(claim_text: str, category: Optional[str] = None) -> str:
    trusted = ", ".join(_trusted_for(category)[:2])
    message = (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Non-Reliable."
    )
    if category:
        message = f"{message} Qaybta: {category}."
    message = f"{message} Fadlan ka hubi ilo la aamini karo sida {trusted}."
    return message


def _static_reliable(claim_text: str, category: Optional[str] = None) -> str:
    message = _STATIC_RELIABLE
    if category:
        message = (
            f"{message}\n\n"
            f"Taladaan caafimaad waxay ku salaysan tahay caddayn "
            f"waxayna ku saabsan tahay {category}."
        )
    return message


def _get_api_key() -> str:
    if has_app_context():
        return (current_app.config.get("GEMINI_API_KEY") or "").strip()
    import os

    return (os.getenv("GEMINI_API_KEY") or "").strip()


def _get_model():
    """Configure and return a Gemini flash model, or None if unavailable."""
    api_key = _get_api_key()
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        # gemini-2.5-flash is unavailable for many new free-tier keys (404).
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini model setup failed: %s", exc)
        return None


def _generate(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Call Gemini with a hard 10s timeout. Return cleaned text or None on failure."""
    model = _get_model()
    if model is None:
        return None

    prompt = f"{system_prompt.strip()}\n\n---\n\n{user_prompt.strip()}"

    def _call() -> str:
        from google.generativeai.types import RequestOptions

        response = model.generate_content(
            prompt,
            request_options=RequestOptions(timeout=REQUEST_TIMEOUT_SECONDS),
        )
        return (getattr(response, "text", None) or "").strip()

    try:
        from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_call)
            text = future.result(timeout=REQUEST_TIMEOUT_SECONDS)
        return text or None
    except FuturesTimeout:
        logger.warning(
            "Gemini generate_content timed out after %ss",
            REQUEST_TIMEOUT_SECONDS,
        )
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini generate_content failed: %s", exc)
        return None


def generate_unreliable_explanation(
    claim_text: str,
    category: Optional[str] = None,
) -> str:
    """Phrase a Non-Reliable verdict in Somali for the keyword-matched category."""
    claim = (claim_text or "").strip()
    cat = (category or "General Health Advice").strip()
    trusted = ", ".join(_trusted_for(cat))

    system_prompt = f"""You are a careful Somali-language health communication assistant for SomAI.

STRICT RULES — you must follow all of them:
1. Your trained classifier already decided this claim is Non-Reliable (not trustworthy). You MUST NOT reverse that decision or invent a new medical judgment.
2. Write ONLY in Somali (Af-Soomaali), 2–3 short sentences.
3. Phrase the result politely: thank the user, state that the claim appears Non-Reliable, mention the category "{cat}", and advise checking trusted sources for that category.
4. You may ONLY mention these trusted resources: {trusted}.
5. Do NOT invent treatments, diagnoses, dosages, or new medical claims.
6. Do NOT claim the claim is Reliable.
7. Output plain Somali text only — no markdown, no bullet lists, no English."""

    user_prompt = (
        "The classifier result is Non-Reliable (final — do not change it).\n"
        f"Category (from keyword matching, not a trained topic model): {cat}\n"
        f"User claim:\n{claim}\n\n"
        "Write the Somali explanation now."
    )
    text = _generate(system_prompt, user_prompt)
    if text:
        return text
    return _static_unreliable(claim, cat)


def generate_reliable_explanation(
    claim_text: str,
    category: Optional[str] = None,
) -> str:
    """Phrase a Reliable verdict in Somali.

    `category` comes from keyword matching (infer_topic_category), not from
    the old SomBERTb Task B topic classifier.
    """
    claim = (claim_text or "").strip()
    cat = (category or "General Health Advice").strip()

    system_prompt = f"""You are a careful Somali-language health communication assistant for SomAI.

STRICT RULES — you must follow all of them:
1. Your trained classifier already decided this claim is Reliable. You MUST NOT reverse that decision or invent a new medical judgment.
2. Write ONLY in Somali (Af-Soomaali), 2–3 short sentences.
3. Phrase the result politely: thank the user, state that the claim appears Reliable / evidence-based, and mention that it is about the category "{cat}".
4. Do NOT invent treatments, diagnoses, dosages, or new medical claims beyond restating the classifier result and category.
5. Do NOT claim the claim is Non-Reliable.
6. Output plain Somali text only — no markdown, no bullet lists, no English."""

    user_prompt = (
        "The classifier result is Reliable (final — do not change it).\n"
        f"Category (from keyword matching, not a trained topic model): {cat}\n"
        f"User claim:\n{claim}\n\n"
        "Write the Somali explanation now."
    )
    text = _generate(system_prompt, user_prompt)
    if text:
        return text
    return _static_reliable(claim, cat)
