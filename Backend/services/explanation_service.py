"""Somali explanation phrasing via Cerebras / Groq + live web search.

The trained Task A model decides Reliable / Non-Reliable.
Cerebras (with Groq failover) only phrases that verdict and picks real
URLs from Facebook / YouTube / web search hits — never invents judgments
or hallucinated links.

When search/API fails, fall back to curated Ministry of Health / WHO links.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from flask import current_app, has_app_context

logger = logging.getLogger(__name__)

# Banned org names in generated TEXT (Somali-first policy). Grounded URLs
# may still be legitimate; this only filters what the Somali message says.
_BANNED_TEXT_PATTERNS = (
    re.compile(r"\bFDA\b", re.IGNORECASE),
    re.compile(r"\bCDC\b", re.IGNORECASE),
    re.compile(r"\bMayo Clinic\b", re.IGNORECASE),
    re.compile(r"\bNHS\b", re.IGNORECASE),
)

# Curated fallback URLs when grounding_metadata is empty.
CURATED_SOURCES: list[dict[str, str]] = [
    {
        "title": "World Health Organization",
        "url": "https://www.who.int/",
    },
    {
        "title": "WHO EMRO — Somalia",
        "url": "https://www.emro.who.int/countries/som/index.html",
    },
    {
        "title": "Somalia Ministry of Health",
        "url": "https://moh.gov.so/",
    },
]

_STATIC_UNRELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Non-Reliable. Fadlan ka hubi ilo "
    "rasmi ah sida WHO iyo Wasaaradda Caafimaadka Soomaaliya."
)

_STATIC_RELIABLE = (
    "Waad ku mahadsantahay weydiinta aad weydiisay. "
    "Markii aan fiirinay taladaan caafimaad, waxay u "
    "muuqataa mid Reliable."
)


def _curated_sources() -> list[dict[str, str]]:
    return [dict(item) for item in CURATED_SOURCES]


def _static_unreliable(claim_text: str = "") -> str:
    _ = claim_text
    return (
        "Waad ku mahadsantahay weydiinta aad weydiisay. "
        "Markii aan fiirinay taladaan caafimaad, waxay u "
        "muuqataa mid Non-Reliable. "
        "Fadlan ka hubi ilo rasmi ah sida WHO iyo Wasaaradda "
        "Caafimaadka Soomaaliya (moh.gov.so)."
    )


def _static_reliable(claim_text: str = "") -> str:
    _ = claim_text
    return _STATIC_RELIABLE


def validate_generated_message(message: str) -> bool:
    """Text-level safety check on the Somali message body.

    Returns False if the message mentions disallowed org names (e.g. FDA)
    that we do not want surfaced in Somali user-facing copy, even when
    grounded search URLs themselves are legitimate.
    """
    text = (message or "").strip()
    if not text:
        return False
    for pattern in _BANNED_TEXT_PATTERNS:
        if pattern.search(text):
            logger.info(
                "validate_generated_message rejected banned term: %s",
                pattern.pattern,
            )
            return False
    return True


_STOP_SIMILAR = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "waa",
    "waxaa",
    "waxay",
    "iyo",
    "ee",
    "oo",
    "ku",
    "ka",
    "la",
    "ah",
    "mid",
    "sida",
    "ama",
    "www",
    "http",
    "https",
    "html",
    "org",
    "com",
}


def _extract_similar_terms(
    claim_text: str,
    sources: list[dict[str, str]],
    search_queries: list[str] | None = None,
) -> list[str]:
    """Build related words/phrases from the claim + live search titles/queries."""
    terms: list[str] = []
    seen: set[str] = set()

    def _add(raw: str) -> None:
        value = re.sub(r"\s+", " ", (raw or "").strip())
        if len(value) < 3:
            return
        key = value.lower()
        if key in seen or key in _STOP_SIMILAR:
            return
        seen.add(key)
        terms.append(value)

    # Prefer search titles / query phrases (closest to "similar words").
    for query in search_queries or []:
        _add(query)

    # Claim tokens (Somali / English health words the user typed).
    for token in re.findall(r"[A-Za-z\u0600-\u06FF]{3,}", claim_text or ""):
        if token.lower() not in _STOP_SIMILAR:
            _add(token)

    # Words from grounded page titles.
    for source in sources:
        title = source.get("title") or ""
        for token in re.findall(r"[A-Za-z\u0600-\u06FF]{4,}", title):
            if token.lower() not in _STOP_SIMILAR:
                _add(token)

    return terms[:12]


def _source_from_hit(hit: dict[str, str]) -> dict[str, str]:
    from services.web_search_service import detect_platform

    url = hit.get("url") or ""
    platform = hit.get("platform") or detect_platform(url)
    return {
        "title": hit.get("title") or url,
        "url": url,
        "platform": platform,
    }


def generate_unreliable_explanation(
    claim_text: str,
    *,
    hits: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Non-Reliable: Cerebras + Facebook/YouTube/web search for similar words/links.

    1) Search Facebook, YouTube, and the open web for pages about THIS claim's topic
    2) Ask Cerebras/Groq to pick similar *reliable* words and real links
       only from those on-topic search hits
    3) Fall back to curated MoH/WHO links if search/API fails
    """
    import json

    claim = (claim_text or "").strip()
    static_message = _static_unreliable(claim)

    from services import web_search_service
    from services.cerebras_client import chat_completion, has_llm_key

    claim_keywords = web_search_service.extract_claim_keywords(claim)
    topic = web_search_service.topic_query(claim)
    if hits is None:
        hits = web_search_service.search_web(claim, max_results=6)
    allowed_urls = {hit["url"] for hit in hits if hit.get("url")}
    platform_counts = web_search_service.platform_counts(hits)

    similar_terms: list[str] = []
    sources: list[dict[str, str]] = []
    message: Optional[str] = None

    if has_llm_key() and hits:
        hits_block = web_search_service.format_hits_for_prompt(hits)
        keywords_text = ", ".join(claim_keywords) if claim_keywords else topic
        prompt = f"""You help SomAI users after a claim was classified Non-Reliable.

User claim:
{claim}

Claim topic keywords (MUST stay on this topic):
{keywords_text}

Live search results from Facebook, YouTube, and the Web
(REAL pages only — you may ONLY cite these URLs):
{hits_block}

Hit counts by platform: Facebook={platform_counts.get('facebook', 0)},
YouTube={platform_counts.get('youtube', 0)}, Web={platform_counts.get('web', 0)}.

Return ONLY valid JSON with this exact shape:
{{
  "message": "2-3 Somali sentences thanking the user, saying THIS claim looks Non-Reliable, and pointing them to reliable sources about the same topic (no URLs in the message, no FDA/CDC/Mayo/NHS names)",
  "similar_reliable_words": ["short on-topic reliable words/phrases"],
  "source_indexes": [1, 2, 3]
}}

Rules:
- similar_reliable_words: 4-8 words/phrases that are DIRECTLY about the claim topic
  ({keywords_text}). Good examples for a chloroquine/coronavirus claim:
  chloroquine, coronavirus, COVID-19, dawo, treatment myth, WHO.
  Do NOT add unrelated generics like vitamins, hygiene, Ramadan, vaccines
  unless those words appear in the claim itself.
- Prefer Somali or English terms that correct / reframe the same topic.
- Do NOT repeat the false claim as a recommended phrase.
- source_indexes: 1-based indexes ONLY for results whose title/snippet clearly
  match the claim keywords. Prefer WHO / moh.gov.so when on-topic.
  Prefer a mix of Facebook / YouTube / Web only when those hits are on-topic.
  Skip off-topic results (e.g. Ramadan tips, generic Ministry pages with no
  mention of the claim topic).
- Never invent URLs. Never invent source indexes that are not in the list.
- message must be Somali only, plain text, and mention the claim topic briefly.
"""
        try:
            raw = chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a careful health assistant. "
                            "Keep similar words and sources tightly on the claim topic. "
                            "Output JSON only. Never invent URLs."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=800,
            )
            start = raw.find("{")
            end = raw.rfind("}")
            payload: dict[str, Any] = {}
            if start >= 0 and end > start:
                payload = json.loads(raw[start : end + 1])

            msg = (payload.get("message") or "").strip()
            if msg and validate_generated_message(msg):
                message = msg

            generic_block = {
                "vaccines",
                "vaccine",
                "hygiene",
                "vitamins",
                "vitamin",
                "ramadan",
                "ramadanka",
                "nutrition",
            }
            claim_keys_lower = {k.lower() for k in claim_keywords}
            for term in payload.get("similar_reliable_words") or []:
                value = re.sub(r"\s+", " ", str(term or "").strip())
                if len(value) < 2:
                    continue
                lower = value.lower()
                if lower in {t.lower() for t in similar_terms}:
                    continue
                if lower in generic_block and lower not in claim_keys_lower:
                    continue
                similar_terms.append(value)

            for index in payload.get("source_indexes") or []:
                try:
                    i = int(index) - 1
                except (TypeError, ValueError):
                    continue
                if i < 0 or i >= len(hits):
                    continue
                hit = hits[i]
                url = hit.get("url") or ""
                if url not in allowed_urls:
                    continue
                if claim_keywords and web_search_service.keyword_overlap(
                    claim_keywords,
                    hit.get("title") or "",
                    hit.get("snippet") or "",
                    hit.get("url") or "",
                ) < 1:
                    continue
                if any(s["url"] == url for s in sources):
                    continue
                sources.append(_source_from_hit(hit))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Cerebras Non-Reliable enrichment failed: %s", exc)

    # If the model did not pick links, take top on-topic hits (relevance first).
    if not sources and hits:
        picked: list[dict[str, str]] = []
        used: set[str] = set()
        ranked = sorted(
            hits,
            key=lambda h: web_search_service.keyword_overlap(
                claim_keywords,
                h.get("title") or "",
                h.get("snippet") or "",
                h.get("url") or "",
            ),
            reverse=True,
        )
        for platform in ("web", "facebook", "youtube"):
            for hit in ranked:
                if hit.get("platform") != platform:
                    continue
                if claim_keywords and web_search_service.keyword_overlap(
                    claim_keywords,
                    hit.get("title") or "",
                    hit.get("snippet") or "",
                    hit.get("url") or "",
                ) < 1:
                    continue
                url = hit.get("url") or ""
                if not url or url in used:
                    continue
                picked.append(_source_from_hit(hit))
                used.add(url)
                break
        for hit in ranked:
            if len(picked) >= 5:
                break
            url = hit.get("url") or ""
            if not url or url in used:
                continue
            if claim_keywords and web_search_service.keyword_overlap(
                claim_keywords,
                hit.get("title") or "",
                hit.get("snippet") or "",
                hit.get("url") or "",
            ) < 1:
                continue
            picked.append(_source_from_hit(hit))
            used.add(url)
        sources = picked

    if not sources:
        sources = [
            {**item, "platform": "web"} for item in _curated_sources()
        ]

    if not similar_terms:
        seed = list(claim_keywords)
        similar_terms = _extract_similar_terms(
            claim,
            sources,
            search_queries=seed
            + [
                hit.get("title") or ""
                for hit in hits
                if hit.get("title")
                and (
                    not claim_keywords
                    or web_search_service.keyword_overlap(
                        claim_keywords,
                        hit.get("title") or "",
                        hit.get("snippet") or "",
                    )
                    >= 1
                )
            ],
        )
        merged: list[str] = []
        seen_terms: set[str] = set()
        for term in seed + similar_terms:
            key = term.lower()
            if key in seen_terms:
                continue
            seen_terms.add(key)
            merged.append(term)
        similar_terms = merged

    if not message or not validate_generated_message(message):
        message = static_message

    return {
        "message": message,
        "sources": sources[:5],
        "similar_terms": similar_terms[:10],
    }


def generate_reliable_explanation(claim_text: str) -> dict[str, Any]:
    """Reliable: skip live search; phrase Task A via Cerebras/Groq or static copy."""
    claim = (claim_text or "").strip()
    static_message = _static_reliable(claim)
    sources = [{**item, "platform": "web"} for item in _curated_sources()]

    from services.cerebras_client import chat_completion, has_llm_key

    message: Optional[str] = None
    if has_llm_key():
        prompt = (
            "Write 2 short Somali sentences thanking the user and saying "
            "this health claim looks Reliable. No URLs. No FDA/CDC/Mayo/NHS names.\n\n"
            f"Claim:\n{claim}"
        )
        try:
            raw = chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You phrase a Reliable verdict in Somali. "
                            "Do not reverse the classifier. Plain text only."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=220,
            )
            msg = (raw or "").strip()
            if msg and validate_generated_message(msg):
                message = msg
        except Exception as exc:  # noqa: BLE001
            logger.warning("Cerebras/Groq Reliable phrasing failed: %s", exc)

    if not message or not validate_generated_message(message):
        message = static_message

    return {
        "message": message,
        "sources": sources[:5],
        "similar_terms": [],
    }

