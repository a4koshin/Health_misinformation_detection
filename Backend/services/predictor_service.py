from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ML_DIR = Path(__file__).resolve().parents[1] / "ml_models"
TASK_A_DIR = ML_DIR / "best_model_task_a"

# Task A checkpoint only stores LABEL_0 / LABEL_1. This is the app mapping:
#   class 0 -> Reliable
#   class 1 -> Non-Reliable
LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {0: "Reliable", 1: "Non-Reliable"}

_device: torch.device | None = None
_task_a_model = None
_task_a_tokenizer = None
_models_loaded = False


def load_models() -> None:
    """Load SomBERTb Task A (reliability). Gatekeeper uses CEREBRAS_API_KEY / GROQ_API_KEY."""
    global _device
    global _task_a_model, _task_a_tokenizer
    global _models_loaded

    if not TASK_A_DIR.exists():
        raise FileNotFoundError(
            f"Missing model folder: {TASK_A_DIR.name} in {ML_DIR}"
        )

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    _task_a_tokenizer = AutoTokenizer.from_pretrained(TASK_A_DIR)
    _task_a_model = AutoModelForSequenceClassification.from_pretrained(
        TASK_A_DIR,
        num_labels=2,
    )
    _task_a_model.config.id2label = dict(ID_TO_LABEL)
    _task_a_model.config.label2id = dict(LABEL_TO_ID)
    _task_a_model.to(_device)
    _task_a_model.eval()

    _models_loaded = True


def _ensure_loaded() -> None:
    if not _models_loaded:
        raise RuntimeError(
            "ML models are not loaded. Add files under ml_models/ and restart."
        )


def clean_text(text: str) -> str:
    """Light cleaning for transformer input."""
    cleaned = (text or "").lower()
    cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)
    cleaned = re.sub(r"@\w+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def check_gatekeeper(text: str) -> bool:
    """Return True if the text is medical, False otherwise (GPT gatekeeper)."""
    from services.gatekeeper_service import check_is_medical

    return check_is_medical(text)


def _predict_with_transformer(
    model: Any,
    tokenizer: Any,
    text: str,
    id_to_label: dict[int, str],
) -> dict[str, Any]:
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256,
    )
    inputs = {key: value.to(_device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)[0]
        pred_id = int(torch.argmax(probs).item())
        confidence = float(probs[pred_id].item())

    label = id_to_label.get(pred_id)
    if label is None:
        # Fallback if an unexpected class id appears.
        label = "Non-Reliable" if pred_id != 0 else "Reliable"

    return {
        "label": label,
        "confidence": confidence,
        "pred_id": pred_id,
        "probs": [float(p) for p in probs.tolist()],
    }


def predict_reliability(text: str) -> dict[str, Any]:
    """Run SomBERTb Task A from ml_models/best_model_task_a.

    Returns {label, confidence, pred_id, probs, model}.
    """
    _ensure_loaded()
    if _task_a_model is None or _task_a_tokenizer is None:
        raise RuntimeError(
            "best_model_task_a is not loaded. Check Backend/ml_models/best_model_task_a."
        )

    result = _predict_with_transformer(
        _task_a_model,
        _task_a_tokenizer,
        text,
        ID_TO_LABEL,
    )
    return {
        "label": result["label"],
        "confidence": result["confidence"],
        "pred_id": result["pred_id"],
        "probs": result["probs"],
        "model": "best_model_task_a",
    }


def run_full_pipeline(text: str) -> dict[str, Any]:
    """
    Pipeline:

      Input claim_text (direct text or transcription)
      Stage 0 GPT gatekeeper -> Non-Medical: STOP
      Stage 1 best_model_task_a -> Reliable / Non-Reliable  (ALWAYS for medical)
      Explanation phrasing via Cerebras/Groq + web search (does NOT change label)
    """
    from services import explanation_service

    cleaned = clean_text(text)
    claim_text = (text or "").strip()

    empty = {
        "is_medical": False,
        "label": None,
        "label_confidence": None,
        "cleaned_text": cleaned,
        "message": (
            "Jumladaan ma aha mid caafimaad ku saabsan. "
            "Fadlan geli xog caafimaad ku saabsan si loo baaro."
        ),
        "sources": [],
        "similar_terms": [],
        "model": None,
        "pred_id": None,
        "class_probs": None,
    }

    if not cleaned:
        return empty

    # Stage 0 — GPT gatekeeper: Medical vs Non-Medical
    is_medical = check_gatekeeper(claim_text)

    if not is_medical:
        return empty

    # Stage 1 — ALWAYS SomBERTb best_model_task_a (never skip / never hardcode label)
    reliability = predict_reliability(cleaned)
    label = reliability["label"]
    label_confidence = float(reliability["confidence"])
    pred_id = int(reliability["pred_id"])
    class_probs = reliability["probs"]
    if label not in {"Reliable", "Non-Reliable"}:
        label = "Non-Reliable"

    print(
        f"[best_model_task_a] pred_id={pred_id} label={label} "
        f"conf={label_confidence:.4f} probs={class_probs} "
        f"text={cleaned[:80]!r}"
    )

    # Explanation only phrases the verdict via Cerebras/Groq + web search.
    if label == "Reliable":
        explanation = explanation_service.generate_reliable_explanation(claim_text)
    else:
        explanation = explanation_service.generate_unreliable_explanation(claim_text)

    message = (
        explanation.get("message") if isinstance(explanation, dict) else explanation
    )
    sources = (
        explanation.get("sources", []) if isinstance(explanation, dict) else []
    )
    similar_terms = (
        explanation.get("similar_terms", [])
        if isinstance(explanation, dict) and label == "Non-Reliable"
        else []
    )

    return {
        "is_medical": True,
        "label": label,
        "label_confidence": label_confidence,
        "cleaned_text": cleaned,
        "message": message,
        "sources": sources,
        "similar_terms": similar_terms,
        "model": "best_model_task_a",
        "pred_id": pred_id,
        "class_probs": class_probs,
    }


def build_message(
    is_medical: bool,
    label: str | None,
) -> str:
    """Somali user-facing copy — kept in sync with run_full_pipeline messages."""
    if not is_medical:
        return (
            "Jumladaan ma aha mid caafimaad ku saabsan. "
            "Fadlan geli xog caafimaad ku saabsan si loo baaro."
        )

    if label != "Reliable":
        return (
            "Waad ku mahadsantahay weydiinta aad weydiisay. "
            "Markii aan fiirinay taladaan caafimaad, waxay u "
            "muuqataa mid Non-Reliable."
        )

    return (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Reliable."
    )


try:
    load_models()
except Exception as exc:  # noqa: BLE001 - allow app boot without weights
    print(f"[predictor_service] Models not loaded yet: {exc}")
