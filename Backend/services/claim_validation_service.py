"""Validate claim input: reject full-sentence invalid inputs only.

Rules:
- Reject a full sentence of numbers
- Reject a full sentence of special characters
- Reject a full sentence of English
- Reject a full sentence of Arabic
"""

from __future__ import annotations

import re

CLAIM_INPUT_EMPTY_MESSAGE = "Text is required."

CLAIM_INPUT_NUMBERS_MESSAGE = (
    "This kind of data is not allowed. "
    "You cannot enter a full sentence of numbers."
)

CLAIM_INPUT_SPECIAL_CHARS_MESSAGE = (
    "This kind of data is not allowed. "
    "You cannot enter a full sentence of special characters."
)

CLAIM_INPUT_ENGLISH_MESSAGE = (
    "This kind of data is not allowed. "
    "You cannot enter a full sentence in English."
)

CLAIM_INPUT_ARABIC_MESSAGE = (
    "This kind of data is not allowed. "
    "You cannot enter a full sentence in Arabic."
)

# Kept for older imports.
CLAIM_INPUT_NOT_ALLOWED_MESSAGE = CLAIM_INPUT_ENGLISH_MESSAGE

_ARABIC_LETTER = re.compile(
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]"
)
_LATIN_LETTER = re.compile(r"[A-Za-z]")
_DIGIT = re.compile(r"\d|[\u0660-\u0669\u06F0-\u06F9]")
_NUMBERS_ONLY = re.compile(r"^[\d\u0660-\u0669\u06F0-\u06F9]+$")
_NON_LETTER_TOKEN = re.compile(r"[^a-z\s]+", re.IGNORECASE)

_ENGLISH_WORDS = {
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "am",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "and",
    "or",
    "but",
    "if",
    "then",
    "so",
    "because",
    "as",
    "of",
    "to",
    "for",
    "from",
    "with",
    "without",
    "in",
    "on",
    "at",
    "by",
    "about",
    "into",
    "over",
    "after",
    "before",
    "not",
    "no",
    "yes",
    "can",
    "cannot",
    "could",
    "should",
    "would",
    "will",
    "shall",
    "may",
    "might",
    "must",
    "do",
    "does",
    "did",
    "have",
    "has",
    "had",
    "having",
    "get",
    "got",
    "make",
    "made",
    "take",
    "taken",
    "use",
    "used",
    "using",
    "help",
    "helps",
    "cure",
    "cures",
    "cured",
    "treat",
    "treats",
    "treatment",
    "medicine",
    "medical",
    "health",
    "healthy",
    "disease",
    "diseases",
    "virus",
    "viruses",
    "covid",
    "corona",
    "coronavirus",
    "water",
    "pain",
    "fever",
    "drug",
    "drugs",
    "pill",
    "pills",
    "tablet",
    "tablets",
    "vaccine",
    "vaccines",
    "doctor",
    "hospital",
    "patient",
    "people",
    "person",
    "good",
    "bad",
    "best",
    "better",
    "safe",
    "unsafe",
    "risk",
    "risky",
    "cause",
    "causes",
    "prevent",
    "prevents",
    "prevention",
    "reduce",
    "reduces",
    "increase",
    "increases",
    "every",
    "all",
    "any",
    "some",
    "many",
    "much",
    "more",
    "most",
    "very",
    "also",
    "just",
    "only",
    "than",
    "when",
    "where",
    "what",
    "which",
    "who",
    "how",
    "why",
    "please",
    "hello",
    "hi",
    "test",
    "testing",
    "example",
    "claim",
    "check",
    "there",
    "here",
    "one",
    "two",
    "three",
    "four",
    "five",
}

_SOMALI_MARKERS = {
    "waa",
    "waxaa",
    "waxa",
    "waxay",
    "waxaan",
    "iyo",
    "ama",
    "ee",
    "oo",
    "ku",
    "ka",
    "la",
    "u",
    "ay",
    "uu",
    "aan",
    "in",
    "inuu",
    "inay",
    "sida",
    "mid",
    "loo",
    "lagu",
    "ugu",
    "soo",
    "si",
    "ah",
    "ayaa",
    "ayaan",
    "maxaa",
    "ma",
    "ha",
    "leh",
    "lahayn",
    "jiray",
    "jirtaa",
    "jirto",
    "qof",
    "dadka",
    "dad",
    "caafimaad",
    "caafimaadka",
    "cudur",
    "cudurka",
    "cudurada",
    "daawo",
    "dawo",
    "dawada",
    "xanuun",
    "xanuunka",
    "biyo",
    "biyaha",
    "cunto",
    "tallaal",
    "tallaalka",
    "maskax",
    "jirrro",
    "jirrada",
    "ammaan",
    "khatar",
    "wanagsan",
    "xun",
    "yareeyaa",
    "daaweeyaan",
    "daaweysaa",
    "ahay",
    "ahaan",
    "yahay",
    "yihiin",
    "tahay",
    "weyn",
    "yar",
    "walba",
    "kasta",
    "fadlan",
    "sheegasho",
    "talada",
    "taladaan",
    "wuu",
    "way",
    "waan",
    "uma",
    "aanan",
}


def _tokenize_words(text: str) -> list[str]:
    cleaned = _NON_LETTER_TOKEN.sub(" ", text.lower())
    return [part for part in cleaned.split() if part]


def _is_full_sentence_of_numbers(text: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    if not compact:
        return False
    return bool(_NUMBERS_ONLY.fullmatch(compact))


def _is_full_sentence_of_special_chars(text: str) -> bool:
    compact = re.sub(r"\s+", "", text)
    if not compact:
        return False
    if _LATIN_LETTER.search(compact) or _ARABIC_LETTER.search(compact):
        return False
    if _DIGIT.search(compact):
        return False
    return True


def _is_full_sentence_of_arabic(text: str) -> bool:
    arabic_letters = 0
    latin_letters = 0
    for ch in text:
        if _ARABIC_LETTER.match(ch):
            arabic_letters += 1
        elif _LATIN_LETTER.match(ch):
            latin_letters += 1
    if arabic_letters == 0:
        return False
    return latin_letters == 0


def _is_full_sentence_of_english(text: str) -> bool:
    if _is_full_sentence_of_arabic(text):
        return False
    if _is_full_sentence_of_numbers(text):
        return False
    if _is_full_sentence_of_special_chars(text):
        return False

    words = _tokenize_words(text)
    if not words:
        return False

    english_hits = sum(1 for word in words if word in _ENGLISH_WORDS)
    somali_hits = sum(1 for word in words if word in _SOMALI_MARKERS)

    # Mixed Somali + occasional English loanword is allowed.
    if somali_hits > 0:
        return False

    if len(words) == 1:
        return words[0] in _ENGLISH_WORDS
    if english_hits == 0:
        return False
    if english_hits / len(words) >= 0.5:
        return True
    if english_hits >= 2:
        return True
    return False


def validate_somali_claim_input(raw: str) -> tuple[bool, str | None]:
    """Return (ok, error_message). error_message is set when ok is False."""
    text = (raw or "").strip()
    if not text:
        return False, CLAIM_INPUT_EMPTY_MESSAGE

    if _is_full_sentence_of_numbers(text):
        return False, CLAIM_INPUT_NUMBERS_MESSAGE

    if _is_full_sentence_of_special_chars(text):
        return False, CLAIM_INPUT_SPECIAL_CHARS_MESSAGE

    if _is_full_sentence_of_arabic(text):
        return False, CLAIM_INPUT_ARABIC_MESSAGE

    if _is_full_sentence_of_english(text):
        return False, CLAIM_INPUT_ENGLISH_MESSAGE

    return True, None
