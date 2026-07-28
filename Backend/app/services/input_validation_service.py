from fastapi import HTTPException, status
from langdetect import DetectorFactory, LangDetectException, detect

from app.services.chat_intent_service import validate_basic_input

DetectorFactory.seed = 0

ENGLISH_MESSAGE = "Qoraal Ingiriis ah lama oggola. Fadlan geli qoraal Soomaali ah."
UNSUPPORTED_LANGUAGE_MESSAGE = "Luqaddan lama taageero. Fadlan geli qoraal Soomaali ah."
UNIDENTIFIED_LANGUAGE_MESSAGE = "Kaliya qoraal Soomaali ah ayaa la oggol yahay."


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


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
    stripped = validate_basic_input(text)
    _validate_language(stripped)

