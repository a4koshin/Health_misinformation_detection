"""Chat intents and pre-model validation for conversational inputs."""

from __future__ import annotations

import random
import re

from fastapi import HTTPException, status

EMPTY_MESSAGE = "Text cannot be empty."
WHITESPACE_ONLY_MESSAGE = "Text cannot contain only spaces."
NUMERIC_ONLY_MESSAGE = "Numeric input is not allowed."
SPECIAL_CHARACTERS_ONLY_MESSAGE = "Special characters only are not allowed."
ARABIC_MESSAGE = "Arabic text is not allowed. Please enter Somali text."

INAPPROPRIATE_MESSAGES = [
    "Please keep this chat professional. Send a Somali health claim to check.",
    "That message is not appropriate here. Paste a Somali health claim instead.",
    "HealthAI only checks health claims. Please avoid flirtatious or casual slang.",
    "Fadlan isticmaal ereyo habboon. Geli sheegasho caafimaad oo Soomaali ah.",
    "This tool is for health information only. Try a Somali health claim.",
]

IDENTITY_REPLIES = [
    "I'm HealthAI — an assistant that checks Somali health claims for misinformation.",
    "Waxaan ahay HealthAI. Waxaan kaa caawinayaa inaad hubiso sheegashooyinka caafimaadka ee Soomaaliga.",
    "I'm HealthAI. Send me a Somali health claim and I'll tell you if it looks Reliable or Misinformation.",
    "Ani waa HealthAI. Ujeedadaydu waa inaan baadho sheegashooyinka caafimaad ee af-Soomaali.",
    "I'm HealthAI, built to help Somali speakers verify health information quickly and clearly.",
]

GREETING_REPLIES = [
    "Hello! Paste a Somali health claim and I'll check it for you.",
    "Hi there — send any Somali health statement and I'll analyze it.",
    "Salaam! Geli sheegasho caafimaad oo Soomaali ah, aan kuu baadho.",
    "Iska warran! Maxaad rabtaa inaad hubiso maanta?",
    "Welcome to HealthAI. Drop a Somali health claim whenever you're ready.",
]

HELP_REPLIES = [
    "I classify Somali health claims as Reliable or Misinformation. Just paste the claim here.",
    "Waxaan kala saaraa sheegashooyinka caafimaad ee Soomaaliga: Reliable ama Misinformation.",
    "Send a Somali health claim — for example something you saw on WhatsApp — and I'll return a verdict.",
    "Ask me to check a Somali health statement. I don't give medical treatment advice.",
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
    r"\bsidee bay u shaqeysaa\b",
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
