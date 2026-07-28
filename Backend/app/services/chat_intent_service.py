"""Chat intents and pre-model validation for conversational inputs."""

from __future__ import annotations

import random
import re

from fastapi import HTTPException, status

EMPTY_MESSAGE = "Qoraalka ma noqon karo mid madhan."
WHITESPACE_ONLY_MESSAGE = "Qoraalka ma noqon karo mid bannaan oo keliya."
NUMERIC_ONLY_MESSAGE = "Lambar keliya lama oggola."
SPECIAL_CHARACTERS_ONLY_MESSAGE = "Calaamado keliya lama oggola."
ARABIC_MESSAGE = "Qoraal Carabi ah lama oggola. Fadlan geli qoraal Soomaali ah."

INAPPROPRIATE_MESSAGES = [
    "Fadlan ha isticmaalin ereyo aan habboonayn. Geli sheegasho caafimaad oo Soomaali ah.",
    "Fariintaan halkan kuma habboona. Fadlan geli sheegasho caafimaad oo Soomaali ah.",
    "HealthAI waxay hubisaa sheegashooyinka caafimaadka oo keliya. Ka fogow ereyada jacaylka.",
    "Fadlan isticmaal ereyo habboon. Geli sheegasho caafimaad oo Soomaali ah.",
    "Qalabkani wuxuu u gaar yahay macluumaadka caafimaadka. Isku day sheegasho Soomaali ah.",
]

IDENTITY_REPLIES = [
    "Waxaan ahay HealthAI — caawiye hubiya sheegashooyinka caafimaad ee Soomaaliga.",
    "Ani waa HealthAI. Waxaan kaa caawinayaa inaad hubiso sheegashooyinka caafimaadka.",
    "Waxaan ahay HealthAI. Ii soo dir sheegasho caafimaad oo Soomaali ah, aan kuu sheego Reliable ama Misinformation.",
    "Ani waa HealthAI. Ujeedadaydu waa inaan baadho sheegashooyinka caafimaad ee af-Soomaali.",
    "Waxaan ahay HealthAI, waxaan u dhisnahay inaan ka caawiyo dadka Soomaalida ah hubinta macluumaadka caafimaadka.",
]

GREETING_REPLIES = [
    "Salaan! Geli sheegasho caafimaad oo Soomaali ah, aan kuu baadho.",
    "Waa ku salaamay — ii soo dir qoraal caafimaad oo Soomaali ah, aan falanqeeyo.",
    "Salaam! Geli sheegasho caafimaad oo Soomaali ah, aan kuu baadho.",
    "Iska warran! Maxaad rabtaa inaad hubiso maanta?",
    "Ku soo dhowow HealthAI. Markaad diyaar tahay geli sheegasho caafimaad oo Soomaali ah.",
]

HELP_REPLIES = [
    "Waxaan kala saaraa sheegashooyinka caafimaad ee Soomaaliga: Reliable ama Misinformation. Kaliya geli sheegashada halkan.",
    "Waxaan kala saaraa sheegashooyinka caafimaad ee Soomaaliga: Reliable ama Misinformation.",
    "Ii soo dir sheegasho caafimaad oo Soomaali ah — tusaale waxaad ka aragtay WhatsApp — aan kuu soo celiyo natiijada.",
    "I weydii inaad hubiso qoraal caafimaad oo Soomaali ah. Anigu ma bixiyo talo daweyn caafimaad.",
    "Geli qoraal caafimaad oo Soomaali ah. Aniga ayaa kuu sheegi doona Reliable ama Misinformation.",
]

# Word-boundary patterns for casual / flirtatious slang (checked before the model).
INAPPROPRIATE_PATTERNS = [
    r"\bbabe\b",
    r"\bbaby\b",
    r"\bhoney\b",
    r"\bsweetie\b",
    r"\bdarling\b",
    r"\bcutie\b",
    r"\blove you\b",
    r"\bi love you\b",
    r"\bkiss\b",
    r"\bhug me\b",
    r"\bsexy\b",
    r"\bboo\b",
    r"\bbebe\b",
    r"\bhabibti\b",
    r"\bhabibi\b",
    r"\bmacaaney\b",
    r"\bmacaanahay\b",
    r"\bjacayl\b",
]

IDENTITY_PATTERNS = [
    r"\bwho are you\b",
    r"\bwhat are you\b",
    r"\bwhat's your name\b",
    r"\bwhats your name\b",
    r"\byour name\b",
    r"\bwho r u\b",
    r"\bwho ru\b",
    r"\btell me about yourself\b",
    r"\bintroduce yourself\b",
    r"\badi maxa tahay\b",
    r"\badi maxaa tahay\b",
    r"\badigu maxaad tahay\b",
    r"\badigu maxa tahay\b",
    r"\bmaxaad tahay\b",
    r"\bmaxa tahay\b",
    r"\byaad tahay\b",
    r"\bkuma tahay\b",
    r"\bmagacaa\b",
    r"\bmagacaaga\b",
    r"\bmagacaga\b",
    r"\byaad tahay\b",
]

GREETING_PATTERNS = [
    r"^\s*hi\s*[!.?]*\s*$",
    r"^\s*hello\s*[!.?]*\s*$",
    r"^\s*hey\s*[!.?]*\s*$",
    r"^\s*hola\s*[!.?]*\s*$",
    r"^\s*salam\s*[!.?]*\s*$",
    r"^\s*salaam\s*[!.?]*\s*$",
    r"^\s*salaamu? calaykum\s*[!.?]*\s*$",
    r"^\s*asalamu? calaykum\s*[!.?]*\s*$",
    r"^\s*iska warran\s*[!.?]*\s*$",
    r"^\s*iska waran\s*[!.?]*\s*$",
    r"^\s*subax wanaagsan\s*[!.?]*\s*$",
    r"^\s*galab wanaagsan\s*[!.?]*\s*$",
    r"^\s*habeen wanaagsan\s*[!.?]*\s*$",
    r"^\s*good morning\s*[!.?]*\s*$",
    r"^\s*good afternoon\s*[!.?]*\s*$",
    r"^\s*good evening\s*[!.?]*\s*$",
    r"^\s*how are you\s*[!.?]*\s*$",
    r"^\s*sidee tahay\s*[!.?]*\s*$",
    r"^\s*sidee tihiin\s*[!.?]*\s*$",
]

HELP_PATTERNS = [
    r"\bwhat can you do\b",
    r"\bhow do you work\b",
    r"\bhow does this work\b",
    r"\bhelp me\b",
    r"^\s*help\s*[!.?]*\s*$",
    r"\bmaxaad sameyn kartaa\b",
    r"\bmaxaad samayn kartaa\b",
    r"\bmaxaad ii sameyn kartaa\b",
    r"\bsidee baa u shaqeysaa\b",
    r"\bsidee buu u shaqeeyaa\b",
    r"\bicaawin\b",
]

ARABIC_SCRIPT_PATTERN = re.compile(
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF"
    r"\uFB50-\uFDFF\uFE70-\uFEFF]"
)
LATIN_LETTER_PATTERN = re.compile(r"[a-zA-ZÀ-ÿ]")
NUMERIC_ONLY_PATTERN = re.compile(r"[\d\s]+")


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def _normalize(text: str) -> str:
    cleaned = text.strip().lower()
    cleaned = cleaned.replace("’", "'").replace("‘", "'")
    cleaned = re.sub(r"[^\w\s']+", " ", cleaned, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).strip()


def _matches_any(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def validate_basic_input(text: str) -> str:
    """Reject empty / junk input before any model call."""
    if not text:
        raise _bad_request(EMPTY_MESSAGE)
    if not text.strip():
        raise _bad_request(WHITESPACE_ONLY_MESSAGE)

    stripped = text.strip()
    if NUMERIC_ONLY_PATTERN.fullmatch(stripped):
        raise _bad_request(NUMERIC_ONLY_MESSAGE)
    if ARABIC_SCRIPT_PATTERN.search(stripped):
        raise _bad_request(ARABIC_MESSAGE)
    if not LATIN_LETTER_PATTERN.search(stripped):
        raise _bad_request(SPECIAL_CHARACTERS_ONLY_MESSAGE)
    return stripped


def validate_appropriate_input(text: str) -> None:
    """Block flirtatious / casual slang before language checks or the model."""
    normalized = _normalize(text)
    if _matches_any(normalized, INAPPROPRIATE_PATTERNS):
        raise _bad_request(random.choice(INAPPROPRIATE_MESSAGES))


def maybe_conversational_reply(text: str) -> str | None:
    """Return a canned reply for identity / greeting / help questions."""
    normalized = _normalize(text)

    if _matches_any(normalized, IDENTITY_PATTERNS):
        return random.choice(IDENTITY_REPLIES)
    if _matches_any(normalized, GREETING_PATTERNS):
        return random.choice(GREETING_REPLIES)
    if _matches_any(normalized, HELP_PATTERNS):
        return random.choice(HELP_REPLIES)
    return None
