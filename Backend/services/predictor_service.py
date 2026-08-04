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
TASK_B_DIR = ML_DIR / "best_model_task_b"

LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {index: label for label, index in LABEL_TO_ID.items()}

TOPIC_TO_ID = {
    "Lifestyle Advice": 0,
    "Medication Advice": 1,
    "Mental Health Advice": 2,
    "Prevention Advice": 3,
}
ID_TO_TOPIC = {index: topic for topic, index in TOPIC_TO_ID.items()}

_device: torch.device | None = None
_gatekeeper_model = None
_gatekeeper_tfidf = None
_task_a_model = None
_task_a_tokenizer = None
_task_b_model = None
_task_b_tokenizer = None
_models_loaded = False


def load_models() -> None:
    """Load gatekeeper + both SomBERTb models once into module-level variables."""
    global _device
    global _gatekeeper_model, _gatekeeper_tfidf
    global _task_a_model, _task_a_tokenizer
    global _task_b_model, _task_b_tokenizer
    global _models_loaded

    missing = []
    for path in (
        GATEKEEPER_MODEL_PATH,
        GATEKEEPER_TFIDF_PATH,
        TASK_A_DIR,
        TASK_B_DIR,
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
        TASK_A_DIR)
    _task_a_model.to(_device)
    _task_a_model.eval()

    _task_b_tokenizer = AutoTokenizer.from_pretrained(TASK_B_DIR)
    _task_b_model = AutoModelForSequenceClassification.from_pretrained(
        TASK_B_DIR)
    _task_b_model.to(_device)
    _task_b_model.eval()

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

    # This gatekeeper was trained with 0 = medical, 1 = non-medical.
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

    return {
        "label": id_to_label[pred_id],
        "confidence": confidence,
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
    return {"label": result["label"], "confidence": result["confidence"]}


def predict_topic(text: str) -> dict[str, Any]:
    """Run SomBERTb task B. Returns {topic, confidence}."""
    _ensure_loaded()
    result = _predict_with_transformer(
        _task_b_model,
        _task_b_tokenizer,
        text,
        ID_TO_TOPIC,
    )
    return {"topic": result["label"], "confidence": result["confidence"]}


def run_full_pipeline(text: str) -> dict[str, Any]:
    """
    Three-stage pipeline with hard early returns:

      Stage 0 gatekeeper → Non-Medical: stop (no Model A/B)
      Stage 1 Model A     → Non-Reliable: stop (no Model B)
      Stage 2 Model B     → only if Model A returned Reliable

    Example expected returns
    ------------------------
    # Non-medical sentence, e.g. "Maanta cimiladu waa fiican tahay."
    # {
    #   "is_medical": False,
    #   "label": None,
    #   "label_confidence": None,
    #   "topic": None,
    #   "topic_confidence": None,
    #   "message": "Jumladaan ma aha mid caafimaad ku saabsan. Fadlan "
    #              "geli xog caafimaad ku saabsan si loo baaro.",
    # }

    # Non-Reliable medical sentence, e.g. a health claim Model A rejects.
    # {
    #   "is_medical": True,
    #   "label": "Non-Reliable",
    #   "label_confidence": 0.91,
    #   "topic": None,
    #   "topic_confidence": None,
    #   "message": "Waad ku mahadsantahay weydiinta aad weydiisay. "
    #              "Markii aan fiirinay taladaan caafimaad, waxay u "
    #              "muuqataa mid Non-Reliable.",
    # }

    # Reliable medical sentence, e.g. a valid health claim.
    # {
    #   "is_medical": True,
    #   "label": "Reliable",
    #   "label_confidence": 0.88,
    #   "topic": "Prevention Advice",
    #   "topic_confidence": 0.76,
    #   "message": "Waad ku mahadsantahay weydiinta aad weydiisay. "
    #              "Markii aan fiirinay taladaan caafimaad, waxay u "
    #              "muuqataa mid Reliable.\\n\\n"
    #              "Taladaan caafimaad waxay soo hoos gasho mowduuca "
    #              "Prevention Advice.",
    # }
    """
    cleaned = clean_text(text)

    if not cleaned:
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "topic": None,
            "topic_confidence": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
        }

    # ------------------------------------------------------------------
    # Stage 0 — Gatekeeper (LinearSVC + TF-IDF): Medical vs Non-Medical
    # ------------------------------------------------------------------
    is_medical = check_gatekeeper(cleaned)

    if not is_medical:
        # STOP HERE. Model A and Model B must not run.
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "topic": None,
            "topic_confidence": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
        }

    # ------------------------------------------------------------------
    # Stage 1 — SomBERTb Model A: Reliable vs Non-Reliable
    # Only reached when gatekeeper returned Medical.
    # ------------------------------------------------------------------
    reliability = predict_reliability(cleaned)
    label = reliability["label"]
    label_confidence = float(reliability["confidence"])

    if label != "Reliable":
        # STOP HERE. Model B must not run.
        # Normalize any non-Reliable class name to "Non-Reliable".
        return {
            "is_medical": True,
            "label": "Non-Reliable",
            "label_confidence": label_confidence,
            "topic": None,
            "topic_confidence": None,
            "cleaned_text": cleaned,
            "message": (
                "Waad ku mahadsantahay weydiinta aad weydiisay. "
                "Markii aan fiirinay taladaan caafimaad, waxay u "
                "muuqataa mid Non-Reliable."
            ),
        }

    # ------------------------------------------------------------------
    # Stage 2 — SomBERTb Model B: Topic
    # Only reached when Model A specifically returned "Reliable".
    # ------------------------------------------------------------------
    topic_result = predict_topic(cleaned)
    topic = topic_result["topic"]
    topic_confidence = float(topic_result["confidence"])

    return {
        "is_medical": True,
        "label": "Reliable",
        "label_confidence": label_confidence,
        "topic": topic,
        "topic_confidence": topic_confidence,
        "cleaned_text": cleaned,
        "message": (
            "Waad ku mahadsantahay weydiinta aad weydiisay. "
            "Markii aan fiirinay taladaan caafimaad, waxay u "
            "muuqataa mid Reliable.\n\n"
            f"Taladaan caafimaad waxay soo hoos gasho mowduuca {topic}."
        ),
    }


def build_message(is_medical: bool, label: str | None, topic: str | None) -> str:
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

    message = (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Reliable."
    )
    if topic:
        message = (
            f"{message}\n\n"
            f"Taladaan caafimaad waxay soo hoos gasho mowduuca {topic}."
        )
    return message


try:
    load_models()
except Exception as exc:  # noqa: BLE001 — allow app boot without weights
    print(f"[predictor_service] Models not loaded yet: {exc}")
