"""HTTP handlers for audio/video transcription → Somali text."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.datastructures import FileStorage

from services import transcription_service

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac", ".flac"}
ALLOWED_EXTENSIONS = ALLOWED_VIDEO_EXTENSIONS | ALLOWED_AUDIO_EXTENSIONS
MAX_MEDIA_BYTES = 100 * 1024 * 1024  # 100 MB


def _extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def _validate_media(file: FileStorage | None) -> tuple[str, str]:
    """Return (filename, kind) where kind is 'audio' or 'video'."""
    if not file or not file.filename:
        raise ValueError("No audio or video file was uploaded.")

    filename = file.filename
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            "Unsupported format. Allowed audio: "
            + ", ".join(sorted(ALLOWED_AUDIO_EXTENSIONS))
            + ". Allowed video: "
            + ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        )

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)

    if size <= 0:
        raise ValueError("The uploaded file is empty or corrupted.")

    if size > MAX_MEDIA_BYTES:
        raise ValueError("File must be 100MB or smaller.")

    # .webm can be audio or video — prefer the explicit form field, else video.
    kind_hint = (request.form.get("kind") or "").strip().lower()
    if kind_hint in {"audio", "video"}:
        kind = kind_hint
    elif ext in ALLOWED_AUDIO_EXTENSIONS - ALLOWED_VIDEO_EXTENSIONS:
        kind = "audio"
    elif ext in ALLOWED_VIDEO_EXTENSIONS - ALLOWED_AUDIO_EXTENSIONS:
        kind = "video"
    else:
        # Ambiguous (.webm): treat as video unless kind=audio was set above.
        kind = "video"

    return filename, kind


@jwt_required()
def transcribe():
    """POST /api/transcribe — multipart audio/video → {"transcribed_text": "..."}."""
    file = (
        request.files.get("file")
        or request.files.get("video")
        or request.files.get("audio")
    )

    try:
        filename, kind = _validate_media(file)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    assert file is not None  # validated above
    ext = _extension(filename)
    media_path: str | None = None

    try:
        fd, media_path = tempfile.mkstemp(suffix=ext)
        os.close(fd)
        file.save(media_path)

        if kind == "audio":
            text = transcription_service.transcribe_audio_file(media_path)
        else:
            text = transcription_service.transcribe_video(media_path)

        return jsonify({"transcribed_text": text}), 200

    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    except FileNotFoundError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": True, "message": str(exc)}), 503
    except Exception:
        # Never leak stack traces / HTML error pages to the client.
        return (
            jsonify(
                {
                    "error": True,
                    "message": (
                        "Unable to transcribe this file. "
                        "It may be corrupted or unsupported."
                    ),
                }
            ),
            500,
        )
    finally:
        if media_path:
            try:
                Path(media_path).unlink(missing_ok=True)
            except OSError:
                pass
