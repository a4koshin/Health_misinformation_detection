import os
import tempfile
import subprocess
from pathlib import Path

from werkzeug.datastructures import FileStorage

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac", ".flac"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS

MAX_AUDIO_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024

def _extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def validate_media_file(file: FileStorage | None, *, kind: str) -> tuple[str, int]:
    if not file or not file.filename:
        raise ValueError(f"No {kind} file was uploaded.")

    filename = file.filename
    ext = _extension(filename)
    allowed = VIDEO_EXTENSIONS if kind == "video" else AUDIO_EXTENSIONS
    if ext not in allowed:
        raise ValueError(
            f"Unsupported {kind} format. Allowed: {', '.join(sorted(allowed))}"
        )

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)

    limit = MAX_VIDEO_BYTES if kind == "video" else MAX_AUDIO_BYTES
    if size > limit:
        mb = limit // (1024 * 1024)
        raise ValueError(f"{kind.capitalize()} must be {mb}MB or smaller.")

    return filename, size


def _save_temp(file: FileStorage, suffix: str) -> Path:
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    path = Path(handle.name)
    handle.close()
    file.save(path)
    return path


def _extract_audio_from_video(video_path: Path) -> Path:
    audio_path = video_path.with_suffix(".wav")
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(video_path),
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000",
                "-ac",
                "1",
                str(audio_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "Video transcription requires ffmpeg. Install ffmpeg or upload an audio file instead."
        ) from exc

    if result.returncode != 0 or not audio_path.exists():
        raise RuntimeError(
            "Could not extract audio from this video. Try an MP3/WAV audio file instead."
        )
    return audio_path


def transcribe_media(file: FileStorage, *, kind: str) -> str:
    """Return pure Somali transcript from an uploaded audio or video file."""
    from services import transcription_service

    filename, _size = validate_media_file(file, kind=kind)
    ext = _extension(filename)

    temp_paths: list[Path] = []
    try:
        media_path = _save_temp(file, ext)
        temp_paths.append(media_path)

        audio_path = media_path
        if kind == "video" or ext in VIDEO_EXTENSIONS:
            audio_path = _extract_audio_from_video(media_path)
            temp_paths.append(audio_path)

        return transcription_service.transcribe_audio_file(str(audio_path)).strip()
    finally:
        for path in temp_paths:
            try:
                if path.exists():
                    path.unlink()
            except OSError:
                pass
