"""Download audio from Facebook / YouTube / other social links for transcription."""

from __future__ import annotations

import ipaddress
import shutil
import socket
import tempfile
from pathlib import Path
from urllib.parse import urlparse

MAX_URL_LENGTH = 2048
# Cap social downloads so CPU ASR can finish; sequential 30s chunks cover this window.
MAX_TRANSCRIBE_SECONDS = 15 * 60

SOCIAL_DOMAINS = (
    "youtube.com",
    "youtu.be",
    "facebook.com",
    "fb.com",
    "fb.watch",
    "instagram.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "threads.net",
)


def _normalize_host(host: str) -> str:
    host = (host or "").lower().rstrip(".")
    if host.startswith("www."):
        return host[4:]
    return host


def _is_social_host(host: str) -> bool:
    host = _normalize_host(host)
    if not host:
        return False
    for domain in SOCIAL_DOMAINS:
        if host == domain or host.endswith("." + domain):
            return True
    return False


def _reject_private_host(host: str) -> None:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise ValueError("Could not resolve this link. Check the URL and try again.") from exc

    for info in infos:
        raw_ip = info[4][0]
        try:
            ip = ipaddress.ip_address(raw_ip)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise ValueError("This link is not allowed.")


def validate_social_media_url(raw: str) -> str:
    url = (raw or "").strip()
    if not url:
        raise ValueError("Paste a Facebook, YouTube, or other social media link.")
    if len(url) > MAX_URL_LENGTH:
        raise ValueError("This link is too long.")

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("The link must start with http:// or https://.")
    if not parsed.netloc:
        raise ValueError("This is not a valid link.")

    host = parsed.hostname or ""
    if not _is_social_host(host):
        raise ValueError(
            "Only Facebook, YouTube, TikTok, Instagram, X, or Threads links are allowed."
        )

    _reject_private_host(host)
    return url


def cleanup_download_dir(directory: str | None) -> None:
    if not directory:
        return
    try:
        shutil.rmtree(directory, ignore_errors=True)
    except OSError:
        pass


def download_social_audio(url: str) -> tuple[str, str]:
    """Download best audio from a social URL.

    Returns (media_path, temp_dir). Caller must delete temp_dir when done.
    """
    safe_url = validate_social_media_url(url)

    try:
        import yt_dlp
        from yt_dlp.utils import DownloadError, ExtractorError, download_range_func
    except ImportError as exc:
        raise RuntimeError(
            "Video link download is not installed. Add yt-dlp to the backend."
        ) from exc

    temp_dir = tempfile.mkdtemp(prefix="somal_social_")
    outtmpl = str(Path(temp_dir) / "media.%(ext)s")

    ydl_opts = {
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "outtmpl": outtmpl,
        "noplaylist": True,
        "playlist_items": "1",
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "overwrites": True,
        "socket_timeout": 30,
        "retries": 2,
        "fragment_retries": 2,
        "nocheckcertificate": True,
        # Long videos: take the opening minute only (enough for a health claim).
        "download_ranges": download_range_func(None, [(0, MAX_TRANSCRIBE_SECONDS)]),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(safe_url, download=False)
            if info is None:
                raise ValueError("Could not read this link. It may be private or unsupported.")

            if info.get("_type") == "playlist":
                entries = [e for e in (info.get("entries") or []) if e]
                if not entries:
                    raise ValueError("This playlist has no downloadable video.")
                info = entries[0]

            ydl.download([safe_url])
    except ValueError:
        cleanup_download_dir(temp_dir)
        raise
    except (DownloadError, ExtractorError) as exc:
        cleanup_download_dir(temp_dir)
        message = str(exc).strip() or "download failed"
        lower = message.lower()
        if "private" in lower or "login" in lower or "unavailable" in lower:
            raise ValueError(
                "Could not download this video. It may be private, deleted, or login-only."
            ) from exc
        raise ValueError(
            "Could not download this video. Check that the link is public and try again."
        ) from exc
    except Exception as exc:
        cleanup_download_dir(temp_dir)
        raise ValueError(
            "Could not download this video. Check that the link is public and try again."
        ) from exc

    files = [
        path
        for path in Path(temp_dir).iterdir()
        if path.is_file() and path.stat().st_size > 0
    ]
    if not files:
        cleanup_download_dir(temp_dir)
        raise ValueError("Download finished but no audio was saved. Try another link.")

    files.sort(key=lambda path: path.stat().st_size, reverse=True)
    return str(files[0]), temp_dir
