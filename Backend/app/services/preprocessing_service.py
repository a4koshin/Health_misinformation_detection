"""Light text cleaning for SomBERTb — matches the transformer training notebook."""

import re


def clean_text(text: str) -> str:
    """
    Minimally clean Somali text for the fine-tuned transformer models.

    Only: lowercase, strip URLs, strip @mentions, collapse whitespace.
    Do not remove stopwords, punctuation, or hashtag words.
    """
    cleaned = str(text).lower()
    cleaned = re.sub(r"http\S+|www\S+", " ", cleaned)
    cleaned = re.sub(r"@\w+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned
