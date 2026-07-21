import json
import re
from pathlib import Path

STOPWORDS_PATH = (
    Path(__file__).resolve().parents[1] / "models" / "somali_stopwords.json"
)

if not STOPWORDS_PATH.exists():
    raise FileNotFoundError(
        f"Missing stopwords file: {STOPWORDS_PATH.name} in {STOPWORDS_PATH.parent}"
    )

somali_stopwords: set[str] = set(json.loads(STOPWORDS_PATH.read_text(encoding="utf-8")))


def clean_text(text: str) -> str:
    """Clean Somali text using the same pipeline as the training notebook."""
    cleaned = str(text).lower()

    # remove URLs
    cleaned = re.sub(r"http\S+|www\S+", " ", cleaned)

    # remove mentions
    cleaned = re.sub(r"@\w+", " ", cleaned)

    # remove hashtags including the word after them
    cleaned = re.sub(r"#\w+", " ", cleaned)

    # keep only letters and spaces
    cleaned = re.sub(r"[^a-zA-ZÀ-ÿ\s]", " ", cleaned)

    # collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # remove Somali stopwords
    words = [word for word in cleaned.split() if word not in somali_stopwords]

    return " ".join(words)
