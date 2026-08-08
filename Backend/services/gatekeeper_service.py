"""Medical vs non-medical gatekeeper via Cerebras / Groq.

Always calls CEREBRAS_API_KEY first, then GROQ_API_KEY on failover.
SomBERTb must not run until this returns MEDICAL.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

_GATEKEEPER_SYSTEM = """You are a medical-topic gatekeeper for Somali health claims.

Classify as MEDICAL only if the text is about health, medicine, disease,
illness, symptoms, treatment, drugs, vitamins, nutrition as health advice,
vaccines, mental health, body organs, pregnancy, or hygiene for health.

Classify as NON_MEDICAL for everything else, including:
passwords, emails, env vars, login credentials, code, sports, shopping,
greetings, politics with no health angle, random English/admin text.

When unsure and there is no real health claim, choose NON_MEDICAL.

Reply with EXACTLY one line and nothing else:
MEDICAL
or
NON_MEDICAL"""

# Fallback only if Cerebras and Groq are unavailable. Word boundaries so
# "healthai" / "Admin123" do not count as medical.
_MEDICAL_HINTS = re.compile(
    r"(?<![A-Za-z])("
    r"caafimaad|cudur|cudurrada|daawo|dawo|daweyn|xanuun|jirrro|jirrada|"
    r"fiitamiin|vitamin|vitamins|tallaal|vaccine|dawooyin|dhiig|maskax|"
    r"calool|neef|qanjidh|ubax|ubaxa|uur|hourka|hour|"
    r"cunto.*(caafimaad|jirka)|jirka|jidhka|bukaansho|bukaan|"
    r"antibiotic|insulin|covid|corona|malaria|cholera|diabetes|"
    r"medicine|medical|health|disease|symptom|treatment|hospital|"
    r"doctor|nurse|clinic|infection|immune|nutrition"
    r")(?![A-Za-z])",
    re.IGNORECASE,
)

_LABEL_TOKEN = re.compile(r"\b(NON[_\s-]?MEDICAL|MEDICAL)\b", re.IGNORECASE)


def _has_medical_hints(text: str) -> bool:
    return bool(_MEDICAL_HINTS.search(text or ""))


def _parse_label(raw: str) -> Optional[bool]:
    """Map model output to True (medical) / False (non-medical) / None (unknown)."""
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
    """Cerebras → Groq medical gatekeeper. True = medical, False = non-medical."""
    claim = (text or "").strip()
    if not claim:
        return False

    from services.cerebras_client import chat_completion, has_llm_key

    hint_medical = _has_medical_hints(claim)

    if not has_llm_key():
        if hint_medical:
            logger.warning("No LLM key; keyword fallback MEDICAL.")
            print("[gatekeeper] no API key; keyword fallback MEDICAL")
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
        logger.warning("Gatekeeper LLM failed on all providers: %s", exc)
        if hint_medical:
            print("[gatekeeper] API failed; keyword fallback MEDICAL")
            return True
        raise RuntimeError(
            "Medical gatekeeper is unavailable. Check CEREBRAS_API_KEY / GROQ_API_KEY and try again."
        ) from exc

    parsed = _parse_label(content)
    if parsed is None:
        logger.warning("Gatekeeper returned unparseable label: %r", content[:240])
        print(f"[gatekeeper] unparseable LLM output; keyword={hint_medical}")
        return hint_medical

    label = "MEDICAL" if parsed else "NON_MEDICAL"
    print(f"[gatekeeper] Cerebras/Groq → {label}")
    logger.info("Gatekeeper LLM classified %s", label)
    return parsed
