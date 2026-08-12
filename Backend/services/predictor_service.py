from __future__ import annotations

import re
import threading
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1] / "ml_models"
# Prefer sombertb_task_a; fall back to older folder names if present.
_MODEL_CANDIDATES = (
    "sombertb_task_a",
    "sombertb_Model",
    "somBERTb_Model",
    "SomBERTb_Model",
    "best_model_task_a",
)
_WEIGHT_NAMES = ("model.safetensors", "pytorch_model.bin", "model.bin")


def _has_weights(path: Path) -> bool:
    return any((path / name).exists() for name in _WEIGHT_NAMES)


def _resolve_model_dir() -> Path:
    for name in _MODEL_CANDIDATES:
        path = ML_DIR / name
        if path.is_dir() and _has_weights(path):
            return path
    return ML_DIR / _MODEL_CANDIDATES[0]


TASK_A_DIR = _resolve_model_dir()
MODEL_NAME = TASK_A_DIR.name

# Task A checkpoint only stores LABEL_0 / LABEL_1. This is the app mapping:
#   class 0 -> Reliable
#   class 1 -> Non-Reliable
LABEL_TO_ID = {"Reliable": 0, "Non-Reliable": 1}
ID_TO_LABEL = {0: "Reliable", 1: "Non-Reliable"}

_device: Any = None
_task_a_model = None
_task_a_tokenizer = None
_models_loaded = False
_load_lock = threading.Lock()


def load_models() -> None:
    """Load SomBERTb reliability classifier. Gatekeeper uses CEREBRAS_API_KEY / GROQ_API_KEY."""
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    global _device
    global _task_a_model, _task_a_tokenizer
    global _models_loaded
    global TASK_A_DIR, MODEL_NAME

    TASK_A_DIR = _resolve_model_dir()
    MODEL_NAME = TASK_A_DIR.name
    if not _has_weights(TASK_A_DIR):
        raise FileNotFoundError(
            f"Model folder {TASK_A_DIR.name} is missing weights "
            f"(expected model.safetensors)."
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
    if _models_loaded and _task_a_model is not None:
        return
    with _load_lock:
        if _models_loaded and _task_a_model is not None:
            return
        try:
            load_models()
        except Exception as exc:
            raise RuntimeError(
                "ML models are not loaded. Add files under ml_models/ and retry."
            ) from exc


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
    import torch

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
    """Run SomBERTb from ml_models/sombertb_task_a.

    Returns {label, confidence, pred_id, probs, model}.
    """
    _ensure_loaded()
    if _task_a_model is None or _task_a_tokenizer is None:
        raise RuntimeError(
            f"{MODEL_NAME} is not loaded. Check Backend/ml_models/{MODEL_NAME}."
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
        "model": MODEL_NAME,
    }


def predict_reliability_batch(
    texts: list[str],
    *,
    batch_size: int = 32,
) -> list[dict[str, Any]]:
    """Run SomBERTb on many claims. Empty strings are skipped (caller handles them)."""
    import torch

    _ensure_loaded()
    if _task_a_model is None or _task_a_tokenizer is None:
        raise RuntimeError(
            f"{MODEL_NAME} is not loaded. Check Backend/ml_models/{MODEL_NAME}."
        )

    outputs: list[dict[str, Any]] = []
    size = max(1, int(batch_size))
    for start in range(0, len(texts), size):
        batch = texts[start : start + size]
        cleaned = [clean_text(item) or item for item in batch]
        encoded = _task_a_tokenizer(
            cleaned,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256,
        )
        encoded = {key: value.to(_device) for key, value in encoded.items()}
        with torch.no_grad():
            logits = _task_a_model(**encoded).logits
            probs = torch.softmax(logits, dim=-1)
            pred_ids = torch.argmax(probs, dim=-1)

        for index in range(len(batch)):
            pred_id = int(pred_ids[index].item())
            confidence = float(probs[index][pred_id].item())
            label = ID_TO_LABEL.get(pred_id)
            if label not in {"Reliable", "Non-Reliable"}:
                label = "Non-Reliable" if pred_id != 0 else "Reliable"
            outputs.append(
                {
                    "label": label,
                    "confidence": confidence,
                    "pred_id": pred_id,
                    "probs": [float(p) for p in probs[index].tolist()],
                    "model": MODEL_NAME,
                }
            )
    return outputs


def classify_claim(text: str) -> dict[str, Any]:
    """Gatekeeper + SomBERTb only. No search and no Cerebras/Groq phrasing."""
    cleaned = clean_text(text)
    claim_text = (text or "").strip()

    empty = {
        "is_medical": False,
        "label": None,
        "label_confidence": None,
        "cleaned_text": cleaned,
        "message": build_message(False, None),
        "sources": [],
        "similar_terms": [],
        "model": None,
        "pred_id": None,
        "class_probs": None,
        "enrichment_pending": False,
    }

    if not cleaned:
        return empty

    # Stage 0 — Cerebras/Groq MUST decide medical vs non-medical first.
    is_medical = check_gatekeeper(claim_text)
    if not is_medical:
        print("[pipeline] gatekeeper NON_MEDICAL — skipping SomBERTb and search")
        return empty

    # Stage 1 — SomBERTb only after MEDICAL.
    reliability = predict_reliability(cleaned)
    label = reliability["label"]
    label_confidence = float(reliability["confidence"])
    pred_id = int(reliability["pred_id"])
    class_probs = reliability["probs"]
    if label not in {"Reliable", "Non-Reliable"}:
        label = "Non-Reliable"

    print(
        f"[{MODEL_NAME}] pred_id={pred_id} label={label} "
        f"conf={label_confidence:.4f} probs={class_probs} "
        f"text={cleaned[:80]!r}"
    )

    return {
        "is_medical": True,
        "label": label,
        "label_confidence": label_confidence,
        "cleaned_text": cleaned,
        "message": build_message(True, label),
        "sources": [],
        "similar_terms": [],
        "model": MODEL_NAME,
        "pred_id": pred_id,
        "class_probs": class_probs,
        "enrichment_pending": True,
    }


def enrich_explanation(claim_text: str, label: str | None) -> dict[str, Any]:
    """Cerebras/Groq phrasing + live search. Does not change the SomBERTb label."""
    from services import explanation_service

    claim = (claim_text or "").strip()
    if label == "Reliable":
        explanation = explanation_service.generate_reliable_explanation(claim)
    elif label in {"Non-Reliable", "Misinformation"}:
        explanation = explanation_service.generate_unreliable_explanation(claim)
    else:
        return {
            "message": build_message(False, None),
            "sources": [],
            "similar_terms": [],
            "enrichment_pending": False,
        }

    message = (
        explanation.get("message") if isinstance(explanation, dict) else explanation
    )
    sources = explanation.get("sources", []) if isinstance(explanation, dict) else []
    similar_terms = (
        explanation.get("similar_terms", [])
        if isinstance(explanation, dict) and label == "Non-Reliable"
        else []
    )
    return {
        "message": message,
        "sources": sources or [],
        "similar_terms": similar_terms or [],
        "enrichment_pending": False,
    }


def run_full_pipeline(text: str) -> dict[str, Any]:
    """Classify with SomBERTb, then optionally enrich (dataset / sync callers)."""
    result = classify_claim(text)
    if not result.get("enrichment_pending"):
        return result

    explanation = enrich_explanation((text or "").strip(), result["label"])
    result["message"] = explanation.get("message") or result["message"]
    result["sources"] = explanation.get("sources") or []
    result["similar_terms"] = explanation.get("similar_terms") or []
    result["enrichment_pending"] = False
    return result


def build_message(
    is_medical: bool,
    label: str | None,
) -> str:
    """Somali user-facing copy - kept in sync with run_full_pipeline messages."""
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
