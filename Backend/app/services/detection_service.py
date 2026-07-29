"""Two-stage SomBERTb detection: reliability, then topic (if Reliable)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from fastapi import HTTPException, status
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.services.input_validation_service import validate_somali_text
from app.services.preprocessing_service import clean_text

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
TASK_A_DIR = MODEL_DIR / "sombertb_task_a"
TASK_B_DIR = MODEL_DIR / "sombertb_task_b"

# Stage 1 — binary reliability (as used during training)
LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {index: label for label, index in LABEL_TO_ID.items()}

# Stage 2 — topic categories in alphabetical training order
TOPIC_TO_ID = {
    "Lifestyle Advice": 0,
    "Medication Advice": 1,
    "Mental Health Advice": 2,
    "Prevention Advice": 3,
}
ID_TO_TOPIC = {index: topic for topic, index in TOPIC_TO_ID.items()}

_device: torch.device | None = None
_task_a_model = None
_task_a_tokenizer = None
_task_b_model = None
_task_b_tokenizer = None


def load_models() -> None:
    """Load both SomBERTb models and tokenizers once at startup."""
    global _device, _task_a_model, _task_a_tokenizer, _task_b_model, _task_b_tokenizer

    missing = [
        path.name
        for path in (TASK_A_DIR, TASK_B_DIR)
        if not path.exists()
    ]
    if missing:
        raise FileNotFoundError(
            f"Missing model folder(s): {', '.join(missing)} in {MODEL_DIR}"
        )

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    _task_a_tokenizer = AutoTokenizer.from_pretrained(TASK_A_DIR)
    _task_a_model = AutoModelForSequenceClassification.from_pretrained(TASK_A_DIR)
    _task_a_model.to(_device)
    _task_a_model.eval()

    _task_b_tokenizer = AutoTokenizer.from_pretrained(TASK_B_DIR)
    _task_b_model = AutoModelForSequenceClassification.from_pretrained(TASK_B_DIR)
    _task_b_model.to(_device)
    _task_b_model.eval()


def _ensure_loaded() -> None:
    if (
        _task_a_model is None
        or _task_a_tokenizer is None
        or _task_b_model is None
        or _task_b_tokenizer is None
        or _device is None
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Detection model is not loaded",
        )


def predict_sentence(
    text: str,
    model: Any,
    tokenizer: Any,
    id_to_class: dict[int, str],
) -> tuple[str, float]:
    """Run a single classification head and return (label, confidence)."""
    _ensure_loaded()
    assert _device is not None

    inputs = tokenizer(
        text,
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors="pt",
    )
    inputs = {key: value.to(_device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)[0]

    predicted_id = int(torch.argmax(probabilities).item())
    confidence = float(probabilities[predicted_id].item())
    label = id_to_class[predicted_id]
    return label, confidence


def predict_full_pipeline(text: str) -> dict[str, Any]:
    """
    Stage 1: Reliable vs Non-Reliable.
    Stage 2: topic category — only when Stage 1 is Reliable.
    """
    _ensure_loaded()

    reliability_label, reliability_confidence = predict_sentence(
        text,
        _task_a_model,
        _task_a_tokenizer,
        ID_TO_LABEL,
    )

    if reliability_label == "Non-Reliable":
        return {
            "label": reliability_label,
            "confidence": reliability_confidence,
            "topic": None,
            "topic_confidence": None,
        }

    topic_label, topic_confidence = predict_sentence(
        text,
        _task_b_model,
        _task_b_tokenizer,
        ID_TO_TOPIC,
    )

    return {
        "label": reliability_label,
        "confidence": reliability_confidence,
        "topic": topic_label,
        "topic_confidence": topic_confidence,
    }


def build_response_message(label: str, topic: str | None = None) -> str:
    """Wrap the raw prediction in a natural Somali reply."""
    message = (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        f"Markii aan fiirinay taladaan caafimaad, waxay u muuqataa mid {label}."
    )
    if label == "Reliable" and topic:
        message = (
            f"{message}\n"
            f"Taladaan caafimaad waxay soo hoos gasho mowduuca {topic}."
        )
    return message


def predict(text: str, *, skip_validation: bool = False) -> str:
    """
    Backward-compatible helper used by chat/history and dataset batch jobs.

    Returns the Stage 1 reliability label: "Reliable" or "Non-Reliable".
    """
    result = predict_detailed(text, skip_validation=skip_validation)
    return str(result["label"])


def predict_detailed(text: str, *, skip_validation: bool = False) -> dict[str, Any]:
    """Validate, lightly clean, then run the full two-stage pipeline."""
    _ensure_loaded()
    if not skip_validation:
        validate_somali_text(text)

    cleaned = clean_text(text)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is empty after preprocessing",
        )

    result = predict_full_pipeline(cleaned)
    result["message"] = build_response_message(result["label"], result["topic"])
    return result
