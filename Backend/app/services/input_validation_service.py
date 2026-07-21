import re

from fastapi import HTTPException, status
from langdetect import DetectorFactory, LangDetectException, detect

DetectorFactory.seed = 0

ARABIC_SCRIPT_PATTERN = re.compile(
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF"
    r"\uFB50-\uFDFF\uFE70-\uFEFF]"
)
LATIN_LETTER_PATTERN = re.compile(r"[a-zA-ZÀ-ÿ]")
NUMERIC_ONLY_PATTERN = re.compile(r"[\d\s]+")

EMPTY_MESSAGE = "Text cannot be empty."
WHITESPACE_ONLY_MESSAGE = "Text cannot contain only spaces."
NUMERIC_ONLY_MESSAGE = "Numeric input is not allowed."
SPECIAL_CHARACTERS_ONLY_MESSAGE = "Special characters only are not allowed."
ARABIC_MESSAGE = "Arabic text is not allowed. Please enter Somali text."
ENGLISH_MESSAGE = "English text is not allowed. Please enter Somali text."
UNSUPPORTED_LANGUAGE_MESSAGE = "Unsupported language. Please enter Somali text."
UNIDENTIFIED_LANGUAGE_MESSAGE = "Only Somali text is supported."


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def _validate_not_empty(text: str) -> None:
    if not text:
        raise _bad_request(EMPTY_MESSAGE)
    if not text.strip():
        raise _bad_request(WHITESPACE_ONLY_MESSAGE)


def _validate_characters(text: str) -> None:
    if NUMERIC_ONLY_PATTERN.fullmatch(text):
        raise _bad_request(NUMERIC_ONLY_MESSAGE)

    if ARABIC_SCRIPT_PATTERN.search(text):
        raise _bad_request(ARABIC_MESSAGE)

    if not LATIN_LETTER_PATTERN.search(text):
        raise _bad_request(SPECIAL_CHARACTERS_ONLY_MESSAGE)


def _validate_language(text: str) -> None:
    try:
        language = detect(text)
    except LangDetectException as exc:
        raise _bad_request(UNIDENTIFIED_LANGUAGE_MESSAGE) from exc

    if language == "so":
        return
    if language == "en":
        raise _bad_request(ENGLISH_MESSAGE)
    raise _bad_request(UNSUPPORTED_LANGUAGE_MESSAGE)


def validate_somali_text(text: str) -> None:
    """Reject invalid or unsupported text before model preprocessing."""
    _validate_not_empty(text)

    stripped = text.strip()
    _validate_characters(stripped)
    _validate_language(stripped)
