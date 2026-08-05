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

LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {index: label for label, index in LABEL_TO_ID.items()}

# Keyword lists for category matching (Somali + English). Used for BOTH
# Reliable and Non-Reliable branches — not a trained classifier.
CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Medication Advice": (
        "daawo",
        "dawo",
        "dawada",
        "medication",
        "medicine",
        "drug",
        "tablet",
        "pill",
        "dose",
        "dosage",
        "antibiotic",
        "aspirin",
        "paracetamol",
        "ibuprofen",
        "insulin",
        "kiniin",
        "kaniini",
        "cab",
        "qaado",
    ),
    "Prevention Advice": (
        "tallaal",
        "tallaalka",
        "vaccine",
        "vaccination",
        "prevention",
        "prevent",
        "ilaali",
        "ka hortag",
        "ka-hortag",
        "mask",
        "gacmo dhaqid",
        "handwash",
        "hand wash",
        "hygiene",
        "nadiifin",
        "covid",
        "immuni",
    ),
    "Lifestyle Advice": (
        "cunto",
        "diet",
        "nutrition",
        "exercise",
        "jimicsi",
        "buurnaan",
        "weight",
        "sleep",
        "hurdo",
        "lifestyle",
        "tobacco",
        "sigaar",
        "alcohol",
        "khamr",
        "biyo",
        "hydration",
        "walk",
        "socod",
    ),
    "Mental Health Advice": (
        "maskax",
        "mental",
        "depression",
        "niyad-jab",
        "niyad jab",
        "anxiety",
        "walwal",
        "stress",
        "walaac",
        "therapy",
        "counsel",
        "suicide",
        "is-dilid",
        "is dilid",
        "trauma",
        "psychiatric",
        "nafs",
    ),
}

DEFAULT_CATEGORY = "General Health Advice"

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
        TASK_A_DIR
    )
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


def infer_topic_category(text: str) -> str:
    """Keyword-match a health category for Reliable and Non-Reliable claims.

    Returns one of: Medication Advice, Prevention Advice, Lifestyle Advice,
    Mental Health Advice, or General Health Advice when nothing matches.
    """
    haystack = clean_text(text)
    if not haystack:
        return DEFAULT_CATEGORY

    scores: dict[str, int] = {name: 0 for name in CATEGORY_KEYWORDS}
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            key = keyword.lower().strip()
            if not key:
                continue
            if key in haystack:
                scores[category] += 1

    best_category = max(scores, key=scores.get)
    if scores[best_category] <= 0:
        return DEFAULT_CATEGORY
    return best_category


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


def run_full_pipeline(text: str) -> dict[str, Any]:
    """
    Pipeline:

      Input claim_text (direct text or transcription)
      Stage 0 gatekeeper → Non-Medical: STOP
      Stage 1 Model A → Reliable / Non-Reliable
      Keyword category for BOTH branches
      Gemini phrases the result for that category
    """
    from services import explanation_service

    cleaned = clean_text(text)
    claim_text = (text or "").strip()

    if not cleaned:
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "category": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
        }

    # ------------------------------------------------------------------
    # Stage 0 — Gatekeeper: Medical vs Non-Medical
    # ------------------------------------------------------------------
    is_medical = check_gatekeeper(cleaned)

    if not is_medical:
        return {
            "is_medical": False,
            "label": None,
            "label_confidence": None,
            "category": None,
            "cleaned_text": cleaned,
            "message": (
                "Jumladaan ma aha mid caafimaad ku saabsan. "
                "Fadlan geli xog caafimaad ku saabsan si loo baaro."
            ),
        }

    # ------------------------------------------------------------------
    # Stage 1 — SomBERTb Model A: Reliable vs Non-Reliable
    # ------------------------------------------------------------------
    reliability = predict_reliability(cleaned)
    label = reliability["label"]
    label_confidence = float(reliability["confidence"])
    if label != "Reliable":
        label = "Non-Reliable"

    # ------------------------------------------------------------------
    # Category — keyword match for BOTH Reliable and Non-Reliable
    # ------------------------------------------------------------------
    category = infer_topic_category(claim_text)

    if label == "Reliable":
        message = explanation_service.generate_reliable_explanation(
            claim_text,
            category,
        )
    else:
        message = explanation_service.generate_unreliable_explanation(
            claim_text,
            category,
        )

    return {
        "is_medical": True,
        "label": label,
        "label_confidence": label_confidence,
        "category": category,
        "cleaned_text": cleaned,
        "message": message,
    }


def build_message(
    is_medical: bool,
    label: str | None,
    category: str | None,
) -> str:
    """Somali user-facing copy — kept in sync with run_full_pipeline messages."""
    if not is_medical:
        return (
            "Jumladaan ma aha mid caafimaad ku saabsan. "
            "Fadlan geli xog caafimaad ku saabsan si loo baaro."
        )

    if label != "Reliable":
        message = (
            "Waad ku mahadsantahay weydiinta aad weydiisay. "
            "Markii aan fiirinay taladaan caafimaad, waxay u "
            "muuqataa mid Non-Reliable."
        )
        if category:
            message = f"{message} Qaybta: {category}."
        return message

    message = (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Reliable."
    )
    if category:
        message = (
            f"{message}\n\n"
            f"Taladaan caafimaad waxay soo hoos gasho mowduuca {category}."
        )
    return message


try:
    load_models()
except Exception as exc:  # noqa: BLE001 — allow app boot without weights
    print(f"[predictor_service] Models not loaded yet: {exc}")
