"""GPT gatekeeper: medical vs non-medical claim screening.

Uses Cerebras (CEREBRAS_API_KEY) with automatic Groq (GROQ_API_KEY) failover
via services.cerebras_client.chat_completion.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

_GATEKEEPER_SYSTEM = """You are a medical-topic gatekeeper for Somali health claims.

Classify as MEDICAL if the text is about ANY of:
health, medicine, disease, illness, symptoms, treatment, drugs, vitamins,
nutrition/diet as health advice, vaccines, mental health, body organs,
pregnancy, hygiene for health, or similar.

Classify as NON_MEDICAL only for clearly unrelated topics
(sports scores, shopping errands, greetings, politics with no health angle, etc.).

When unsure but health words appear, choose MEDICAL.

Reply with EXACTLY one line and nothing else:
MEDICAL
or
NON_MEDICAL"""

# Strong Somali / English medical cues — used as a safety net.
_MEDICAL_HINTS = re.compile(
    r"("
    r"caafimaad|cudur|cudurrada|daawo|dawo|daweyn|xanuun|jirrro|jirrada|"
    r"fiitamiin|vitamin|vitamins|tallaal|vaccine|dawooyin|dhiig|maskax|"
    r"calool|neef|qanjidh|ubax|ubaxa|uur|hourka|hour|"
    r"cunto.*(caafimaad|jirka)|jirka|jidhka|bukaansho|bukaan|"
    r"antibiotic|insulin|covid|corona|malaria|cholera|diabetes|"
    r"medicine|medical|health|disease|symptom|treatment|hospital|"
    r"doctor|nurse|clinic|infection|immune|nutrition"
    r")",
    re.IGNORECASE,
)

_LABEL_TOKEN = re.compile(r"\b(NON[_\s-]?MEDICAL|MEDICAL)\b", re.IGNORECASE)


def _has_medical_hints(text: str) -> bool:
    return bool(_MEDICAL_HINTS.search(text or ""))


def _parse_label(raw: str) -> Optional[bool]:
    """Map model output to True (medical) / False (non-medical) / None (unknown).

    Uses the LAST explicit MEDICAL / NON_MEDICAL token so long reasoning
    that mentions both options does not flip the verdict incorrectly.
    """
    text = (raw or "").strip()
    if not text:
        return None

    matches = list(_LABEL_TOKEN.finditer(text))
    if matches:
        token = re.sub(r"[\s-]+", "_", matches[-1].group(1).upper())
        if token.startswith("NON"):
            return False
        return True

    upper = text.upper()
    if upper == "MEDICAL":
        return True
    if upper in {"NON_MEDICAL", "NONMEDICAL", "NON MEDICAL"}:
        return False
    return None


def check_is_medical(text: str) -> bool:
    """Return True if the claim is medical/health-related, else False.

    Raises RuntimeError when no LLM key works and keyword fallback cannot decide.
    """
    claim = (text or "").strip()
    if not claim:
        return False

    # Fast path: clear health vocabulary → medical (avoids false NON_MEDICAL).
    hint_medical = _has_medical_hints(claim)

    from services.cerebras_client import chat_completion, has_llm_key

    if not has_llm_key():
        if hint_medical:
            logger.info("No LLM key; using medical keyword fallback.")
            return True
        raise RuntimeError(
            "No LLM API key set. Add CEREBRAS_API_KEY and/or GROQ_API_KEY to Backend/.env."
        )

    try:
        content = chat_completion(
            messages=[
                {"role": "system", "content": _GATEKEEPER_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        "Classify the following text as MEDICAL or NON_MEDICAL.\n"
                        "Answer with one token only.\n\n"
                        f"{claim}"
                    ),
                },
            ],
            temperature=0,
            max_tokens=64,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("GPT gatekeeper call failed on all providers: %s", exc)
        if hint_medical:
            logger.info("Gatekeeper API failed; using medical keyword fallback.")
            return True
        raise RuntimeError(
            "Medical gatekeeper is unavailable. Check CEREBRAS_API_KEY / GROQ_API_KEY and try again."
        ) from exc

    parsed = _parse_label(content)
    if parsed is None:
        logger.warning("GPT gatekeeper returned unparseable label: %r", content[:240])
        return hint_medical

    # If the model says non-medical but the text clearly has health terms,
    # trust the keyword signal (fixes false NON_MEDICAL from reasoning noise).
    if parsed is False and hint_medical:
        logger.info(
            "Gatekeeper said NON_MEDICAL but medical keywords present — treating as MEDICAL."
        )
        return True

    return parsed
