"""Live Facebook / YouTube / web search for Non-Reliable claim support.

Searches are keyed to claim keywords so results stay on-topic
(e.g. chloroquine + coronavirus, not generic hygiene/Ramadan videos).
"""

from __future__ import annotations

import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, wait
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

PREFERRED_HOST_HINTS = (
    "who.int",
    "emro.who.int",
    "moh.gov.so",
    "cdc.gov",
    "nih.gov",
    "unicef.org",
    "gov.so",
    "facebook.com",
    "fb.com",
    "youtube.com",
    "youtu.be",
)

TRUSTED_SOCIAL_HINTS = (
    "who",
    "world health",
    "ministry of health",
    "moh",
    "unicef",
    "caafimaad",
    "somalia",
)

_STOP_WORDS = {
    "waa",
    "waxay",
    "waxa",
    "oo",
    "ee",
    "ah",
    "ku",
    "ka",
    "la",
    "loo",
    "ugu",
    "iyo",
    "ama",
    "in",
    "ay",
    "uu",
    "ayay",
    "leh",
    "the",
    "a",
    "an",
    "is",
    "are",
    "for",
    "of",
    "to",
    "and",
    "or",
    "with",
    "this",
    "that",
    "from",
    "on",
    "in",
}


def _normalize_url(url: str) -> str:
    value = (url or "").strip()
    if not value:
        return ""
    if value.startswith("//"):
        value = "https:" + value
    return value


def _host(url: str) -> str:
    try:
        return (urlparse(url).netloc or "").lower().removeprefix("www.")
    except Exception:  # noqa: BLE001
        return ""


def detect_platform(url: str) -> str:
    """Return facebook | youtube | web for a URL."""
    host = _host(url)
    if "facebook.com" in host or host.endswith("fb.com") or "fb.watch" in host:
        return "facebook"
    if "youtube.com" in host or host.endswith("youtu.be") or "youtube-nocookie.com" in host:
        return "youtube"
    return "web"


def extract_claim_keywords(claim_text: str) -> list[str]:
    """Pull topic keywords from the claim (drug names, diseases, etc.)."""
    claim = re.sub(r"\s+", " ", (claim_text or "").strip())
    if not claim:
        return []

    tokens = re.findall(r"[A-Za-z\u0600-\u06FF0-9]{3,}", claim)
    keywords: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        key = token.lower()
        if key in _STOP_WORDS or key in seen:
            continue
        seen.add(key)
        keywords.append(token)
    return keywords[:12]


def _claim_snippet(claim_text: str, *, max_words: int = 18) -> str:
    claim = re.sub(r"\s+", " ", (claim_text or "").strip())
    if not claim:
        return ""
    words = claim.split(" ")
    if len(words) <= max_words:
        return claim
    return " ".join(words[:max_words])


def topic_query(claim_text: str) -> str:
    """Short topic string used for focused searches."""
    keywords = extract_claim_keywords(claim_text)
    if len(keywords) >= 2:
        return " ".join(keywords[:6])
    return _claim_snippet(claim_text, max_words=12)


def keyword_overlap(claim_keywords: list[str], *parts: str) -> int:
    """How many claim keywords appear in the combined text."""
    if not claim_keywords:
        return 0
    text = " ".join(parts).lower()
    return sum(1 for key in claim_keywords if key.lower() in text)


def _rank_score(
    url: str,
    title: str,
    snippet: str,
    platform: str,
    claim_keywords: list[str],
) -> int:
    host = _host(url)
    score = 0
    overlap = keyword_overlap(claim_keywords, title, snippet, url)
    # Relevance to the claim is the main signal.
    score += overlap * 12

    for hint in PREFERRED_HOST_HINTS:
        if hint in host:
            score += 6

    text = f"{title} {snippet} {host}".lower()
    if any(k in text for k in ("who", "fact check", "myth", "misinformation", "treatment")):
        score += 3
    if platform in {"facebook", "youtube"} and any(k in text for k in TRUSTED_SOCIAL_HINTS):
        score += 2

    # Soft platform boost only when the hit is already on-topic.
    if overlap > 0:
        if platform == "facebook":
            score += 1
        if platform == "youtube":
            score += 1
    return score


def build_search_queries(claim_text: str) -> list[str]:
    """Build claim-focused queries across Facebook, YouTube, and the web."""
    topic = topic_query(claim_text)
    claim = _claim_snippet(claim_text)
    if not topic and not claim:
        return []

    focus = topic or claim
    queries = [
        f"{focus} WHO health",
        f"{focus} site:facebook.com",
        f"{focus} site:youtube.com",
    ]
    seen: set[str] = set()
    unique: list[str] = []
    for query in queries:
        key = (query or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(query.strip())
    return unique


def _get_ddgs():
    try:
        from ddgs import DDGS

        return DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS  # older package name

            return DDGS
        except ImportError as exc:
            logger.warning("ddgs/duckduckgo_search not installed: %s", exc)
            return None


def _append_hit(
    hits: list[dict[str, str]],
    seen_urls: set[str],
    *,
    url: str,
    title: str,
    snippet: str,
    platform: str | None = None,
) -> None:
    url = _normalize_url(url)
    if not url or not url.startswith("http"):
        return
    if url in seen_urls:
        return
    seen_urls.add(url)
    resolved_platform = platform or detect_platform(url)
    hits.append(
        {
            "title": (title or "").strip() or url,
            "url": url,
            "snippet": (snippet or "").strip(),
            "platform": resolved_platform,
        }
    )


def _is_relevant(hit: dict[str, str], claim_keywords: list[str]) -> bool:
    if not claim_keywords:
        return True
    overlap = keyword_overlap(
        claim_keywords,
        hit.get("title") or "",
        hit.get("snippet") or "",
        hit.get("url") or "",
    )
    if overlap >= 1:
        return True
    # Keep strong official hosts only if at least a weak disease/drug hint
    # is impossible — drop them when zero overlap so we don't show Ramadan tips.
    return False


def _query_timeout_seconds() -> float:
    try:
        return max(2.0, float(os.getenv("DDGS_QUERY_TIMEOUT", "5")))
    except ValueError:
        return 5.0


def _overall_timeout_seconds() -> float:
    try:
        return max(3.0, float(os.getenv("DDGS_OVERALL_TIMEOUT", "10")))
    except ValueError:
        return 10.0


def _text_search(query: str, max_results: int = 4) -> list[dict[str, Any]]:
    DDGS = _get_ddgs()
    if DDGS is None:
        return []
    timeout = _query_timeout_seconds()
    try:
        client = DDGS(timeout=timeout)
    except TypeError:
        client = DDGS()
    try:
        with client:
            return list(client.text(query, max_results=max_results) or [])
    except Exception as exc:  # noqa: BLE001
        logger.warning("Web search failed for query=%r: %s", query, exc)
        return []


def search_web(claim_text: str, *, max_results: int = 6) -> list[dict[str, str]]:
    """Search Facebook, YouTube, and the web; keep only claim-relevant hits."""
    queries = build_search_queries(claim_text)[:3]
    if not queries:
        return []

    if _get_ddgs() is None:
        return []

    claim_keywords = extract_claim_keywords(claim_text)
    hits: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    pool = ThreadPoolExecutor(max_workers=min(3, len(queries)))
    try:
        futures = {
            pool.submit(_text_search, query, 4): query for query in queries
        }
        done, not_done = wait(futures, timeout=_overall_timeout_seconds())
        for fut in not_done:
            fut.cancel()
        for fut in done:
            query = futures[fut]
            try:
                rows = fut.result(timeout=0.1)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Web search future failed for query=%r: %s", query, exc)
                continue
            for row in rows or []:
                if not isinstance(row, dict):
                    continue
                url = str(row.get("href") or row.get("link") or row.get("url") or "")
                _append_hit(
                    hits,
                    seen_urls,
                    url=url,
                    title=str(row.get("title") or ""),
                    snippet=str(row.get("body") or row.get("snippet") or ""),
                )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Web search session failed: %s", exc)
        return []
    finally:
        pool.shutdown(wait=False, cancel_futures=True)

    # Drop off-topic hits (e.g. Ramadan tips for a chloroquine claim).
    relevant = [hit for hit in hits if _is_relevant(hit, claim_keywords)]
    if not relevant and hits:
        # Soft fallback: keep highest overlap even if 0 after sort — prefer none
        # over random; if all zero, keep official-host hits only.
        official = [
            hit
            for hit in hits
            if any(
                hint in _host(hit.get("url") or "")
                for hint in ("who.int", "moh.gov.so", "emro.who.int", "gov.so")
            )
        ]
        relevant = official or hits[: max_results]

    relevant.sort(
        key=lambda item: _rank_score(
            item["url"],
            item.get("title") or "",
            item.get("snippet") or "",
            item.get("platform") or detect_platform(item["url"]),
            claim_keywords,
        ),
        reverse=True,
    )

    # Prefer relevance; keep a light platform mix only among on-topic hits.
    by_platform: dict[str, list[dict[str, str]]] = {
        "facebook": [],
        "youtube": [],
        "web": [],
    }
    for hit in relevant:
        platform = hit.get("platform") or detect_platform(hit["url"])
        hit["platform"] = platform
        hit["overlap"] = str(
            keyword_overlap(
                claim_keywords,
                hit.get("title") or "",
                hit.get("snippet") or "",
                hit.get("url") or "",
            )
        )
        if platform in by_platform:
            by_platform[platform].append(hit)

    balanced: list[dict[str, str]] = []
    per_platform = max(2, max_results // 3)
    for platform in ("web", "facebook", "youtube"):
        balanced.extend(by_platform[platform][:per_platform])

    seen_balanced = {item["url"] for item in balanced}
    for hit in relevant:
        if len(balanced) >= max_results:
            break
        if hit["url"] in seen_balanced:
            continue
        balanced.append(hit)
        seen_balanced.add(hit["url"])

    return balanced[:max_results]


def format_hits_for_prompt(hits: list[dict[str, str]]) -> str:
    if not hits:
        return "(no live search results)"
    lines: list[str] = []
    for index, hit in enumerate(hits, start=1):
        platform = (hit.get("platform") or detect_platform(hit.get("url") or "")).upper()
        lines.append(
            f"[{index}] platform={platform}\n"
            f"    title={hit.get('title','')}\n"
            f"    url={hit.get('url','')}\n"
            f"    snippet={hit.get('snippet','')[:220]}"
        )
    return "\n".join(lines)


def platform_counts(hits: list[dict[str, str]]) -> dict[str, int]:
    counts = {"facebook": 0, "youtube": 0, "web": 0}
    for hit in hits:
        platform = hit.get("platform") or detect_platform(hit.get("url") or "")
        if platform in counts:
            counts[platform] += 1
    return counts
