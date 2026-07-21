from pathlib import Path

import joblib
from fastapi import HTTPException, status

from app.services.input_validation_service import validate_somali_text
from app.services.preprocessing_service import clean_text

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
MODEL_PATH = MODEL_DIR / "best_svm_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"
LABEL_ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"

_model = None
_vectorizer = None
_label_encoder = None


def load_models() -> None:
    """Load SVM, TF-IDF vectorizer, and label encoder once at startup."""
    global _model, _vectorizer, _label_encoder

    missing = [
        path.name
        for path in (MODEL_PATH, VECTORIZER_PATH, LABEL_ENCODER_PATH)
        if not path.exists()
    ]
    if missing:
        raise FileNotFoundError(
            f"Missing model artifact(s): {', '.join(missing)} in {MODEL_DIR}"
        )

    _model = joblib.load(MODEL_PATH)
    _vectorizer = joblib.load(VECTORIZER_PATH)
    _label_encoder = joblib.load(LABEL_ENCODER_PATH)


def _ensure_loaded() -> None:
    if _model is None or _vectorizer is None or _label_encoder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Detection model is not loaded",
        )


def predict(text: str) -> str:
    """
    Predict reliability label for Somali text.

    Returns one of: "Reliable", "Misinformation"
    """
    _ensure_loaded()
    validate_somali_text(text)

    cleaned = clean_text(text)
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is empty after preprocessing",
        )

    features = _vectorizer.transform([cleaned])
    encoded_prediction = _model.predict(features)
    label = _label_encoder.inverse_transform(encoded_prediction)[0]
    return str(label)
