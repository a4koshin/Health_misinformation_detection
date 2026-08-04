"""HTTP handlers for video transcription → Somali text."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.datastructures import FileStorage

from services import transcription_service

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB


def _extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def _validate_video(file: FileStorage | None) -> tuple[str, int]:
    if not file or not file.filename:
        raise ValueError("No video file was uploaded.")

    filename = file.filename
    ext = _extension(filename)
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise ValueError(
            "Unsupported video format. Allowed: "
            + ", ".join(sorted(ALLOWED_VIDEO_EXTENSIONS))
        )

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)

    if size <= 0:
        raise ValueError("The uploaded video file is empty or corrupted.")

    if size > MAX_VIDEO_BYTES:
        raise ValueError("Video must be 100MB or smaller.")

    return filename, size


@jwt_required()
def transcribe():
    """POST /api/transcribe — multipart video → {"transcribed_text": "..."}."""
    file = request.files.get("file") or request.files.get("video")

    try:
        filename, _size = _validate_video(file)
    except ValueError as exc:
        return jsonify({"error": True, "message": str(exc)}), 400

    assert file is not None  # validated above
    ext = _extension(filename)
    video_path: str | None = None

    try:
        fd, video_path = tempfile.mkstemp(suffix=ext)
        os.close(fd)
        file.save(video_path)

        text = transcription_service.transcribe_video(video_path)
        return jsonify({"transcribed_text": text}), 200

    except ValueError as exc:
        # e.g. no audio track
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
                        "Unable to transcribe this video. "
                        "The file may be corrupted or unsupported."
                    ),
                }
            ),
            500,
        )
    finally:
        if video_path:
            try:
                Path(video_path).unlink(missing_ok=True)
            except OSError:
                pass
