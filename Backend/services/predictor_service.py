from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import joblib
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ML_DIR = Path(__file__).resolve().parents[1] / "ml_models"
GATEKEEPER_MODEL_PATH = ML_DIR / "gatekeeper_model.pkl"
GATEKEEPER_TFIDF_PATH = ML_DIR / "gatekeeper_tfidf.pkl"
TASK_A_DIR = ML_DIR / "best_model_task_a"

# Task A checkpoint only stores LABEL_0 / LABEL_1. This is the app mapping:
#   class 0 -> Reliable
#   class 1 -> Non-Reliable
LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {0: "Reliable", 1: "Non-Reliable"}

_device: torch.device | None = None
_gatekeeper_model = None
_gatekeeper_tfidf = None
_task_a_model = None
_task_a_tokenizer = None
_models_loaded = False


def load_models() -> None:
    """Load gatekeeper + SomBERTb Task A (reliability) only — no Task B."""
    global _device
    global _gatekeeper_model, _gatekeeper_tfidf
    global _task_a_model, _task_a_tokenizer
    global _models_loaded

    missing = []
    for path in (
        GATEKEEPER_MODEL_PATH,
        GATEKEEPER_TFIDF_PATH,
        TASK_A_DIR,
    ):
        if not path.exists():
            missing.append(path.name)

    if missing:
        raise FileNotFoundError(
            f"Missing model file(s)/folder(s): {', '.join(missing)} in {ML_DIR}"
        )

    _gatekeeper_model = joblib.load(GATEKEEPER_MODEL_PATH)
    _gatekeeper_tfidf = joblib.load(GATEKEEPER_TFIDF_PATH)

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
    """Light cleaning for transformer / TF-IDF input."""
    cleaned = (text or "").lower()
    cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)
    cleaned = re.sub(r"@\w+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def check_gatekeeper(text: str) -> bool:
    """Return True if the text is medical, False otherwise."""
    _ensure_loaded()
    features = _gatekeeper_tfidf.transform([text])
    prediction = _gatekeeper_model.predict(features)[0]

    if isinstance(prediction, str):
        return prediction.lower() in {"medical", "health", "true", "yes"}

    # Gatekeeper training: 0 = medical, 1 = non-medical.
    return int(prediction) == 0


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
    """Run SomBERTb task A. Returns {label, confidence}."""
    _ensure_loaded()
    result = _predict_with_transformer(
        _task_a_model,
        _task_a_tokenizer,
        text,
        ID_TO_LABEL,
    )
    return {
        "label": result["label"],
        "confidence": result["confidence"],
    }


def run_full_pipeline(text: str) -> dict[str, Any]:
    """
    Pipeline:

      Input claim_text (direct text or transcription)
      Stage 0 gatekeeper -> Non-Medical: STOP
      Stage 1 Model A -> Reliable / Non-Reliable
      Gemini phrases the result (optional grounded sources)
    """
    from services import explanation_service

    cleaned = clean_text(text)
    claim_text = (text or "").strip()

    if not cleaned:
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
            "sources": [],
        }

    # Stage 0 — Gatekeeper: Medical vs Non-Medical
    is_medical = check_gatekeeper(cleaned)

    if not is_medical:
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
            "sources": [],
        }

    # Stage 1 — SomBERTb Model A: Reliable vs Non-Reliable
    reliability = predict_reliability(cleaned)
    label = reliability["label"]
    label_confidence = float(reliability["confidence"])
    if label not in {"Reliable", "Non-Reliable"}:
        label = "Non-Reliable"

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

    return {
        "is_medical": True,
        "label": label,
        "label_confidence": label_confidence,
        "cleaned_text": cleaned,
        "message": message,
        "sources": sources,
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
