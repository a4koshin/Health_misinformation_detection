"""Somali video → text transcription (Paza Whisper).

microsoft/paza-whisper-large-v3-turbo was chosen because it is specifically
fine-tuned for Somali (among other East African languages), unlike the generic
multilingual Whisper base model.
"""

from __future__ import annotations

import os
import re
import tempfile
import threading
from pathlib import Path

# Cached ASR pipeline — loaded once on first transcribe, reused after that.
_asr_pipeline = None
_asr_lock = threading.Lock()

# Hugging Face id — Somali / East-African fine-tuned Whisper turbo.
TRANSCRIPTION_MODEL_ID = "microsoft/paza-whisper-large-v3-turbo"

# Whisper sometimes leaks special tokens into the decoded string, e.g. <|transcribe|>.
_WHISPER_SPECIAL_TOKEN_RE = re.compile(r"<\|[^|>]*\|>")


def _clean_transcript(text: str) -> str:
    """Strip Whisper special tokens and collapse leftover whitespace."""
    cleaned = _WHISPER_SPECIAL_TOKEN_RE.sub(" ", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def load_transcription_model():
    """Load the ASR pipeline once into the module-level cache.

    Uses CUDA when available, otherwise CPU.
    """
    global _asr_pipeline
    if _asr_pipeline is not None:
        return _asr_pipeline

    with _asr_lock:
        if _asr_pipeline is not None:
            return _asr_pipeline

        import torch
        from transformers import pipeline

        device = 0 if torch.cuda.is_available() else -1
        _asr_pipeline = pipeline(
            "automatic-speech-recognition",
            model=TRANSCRIPTION_MODEL_ID,
            device=device,
            chunk_length_s=30,
        )
        return _asr_pipeline


def extract_audio(video_path: str) -> str:
    """Extract mono 16 kHz WAV audio from a video file via moviepy.

    Returns the path to a temporary .wav file. Caller must delete it.
    """
    try:
        # moviepy 2.x
        from moviepy import VideoFileClip
    except ImportError:  # pragma: no cover - older installs
        from moviepy.editor import VideoFileClip

    path = Path(video_path)
    if not path.is_file():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    clip = VideoFileClip(str(path))
    try:
        if clip.audio is None:
            raise ValueError(
                "This video has no audio track. Upload a video that includes speech."
            )

        fd, audio_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

        # Whisper expects ~16 kHz audio.
        clip.audio.write_audiofile(
            audio_path,
            fps=16000,
            nbytes=2,
            codec="pcm_s16le",
            logger=None,
        )
        return audio_path
    finally:
        clip.close()


def transcribe_audio(audio_path: str) -> str:
    """Run the loaded Whisper model on an audio file; return Somali text."""
    asr = load_transcription_model()
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        result = asr(
            str(path),
            generate_kwargs={"language": "so", "task": "transcribe"},
        )
    except TypeError:
        # Older transformers builds may not accept generate_kwargs the same way.
        result = asr(str(path))

    if isinstance(result, dict):
        text = (result.get("text") or "").strip()
    else:
        text = str(result or "").strip()

    text = _clean_transcript(text)

    if not text:
        raise RuntimeError(
            "No speech was detected in this recording. Try a clearer audio file."
        )
    return text


def normalize_audio_to_wav(audio_path: str) -> str:
    """Convert any audio file to mono 16 kHz WAV for Whisper.

    Returns a temp .wav path. Caller must delete it.
    """
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    try:
        import subprocess

        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(path),
                "-vn",
                "-acodec",
                "pcm_s16le",
                "-ar",
                "16000",
                "-ac",
                "1",
                wav_path,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        Path(wav_path).unlink(missing_ok=True)
        raise RuntimeError(
            "Audio transcription requires ffmpeg. Install ffmpeg and try again."
        ) from exc

    if result.returncode != 0 or not Path(wav_path).is_file():
        Path(wav_path).unlink(missing_ok=True)
        raise RuntimeError(
            "Could not read this audio file. Try MP3 or WAV instead."
        )

    return wav_path


def transcribe_audio_file(audio_path: str) -> str:
    """Normalize an uploaded audio file to WAV, then transcribe as Somali."""
    wav_path: str | None = None
    try:
        # Already-WAV uploads still get normalized to 16 kHz mono.
        wav_path = normalize_audio_to_wav(audio_path)
        return transcribe_audio(wav_path)
    finally:
        if wav_path:
            try:
                Path(wav_path).unlink(missing_ok=True)
            except OSError:
                pass


def transcribe_video(video_path: str) -> str:
    """Extract audio from video, transcribe, and always delete the temp WAV."""
    audio_path: str | None = None
    try:
        audio_path = extract_audio(video_path)
        return transcribe_audio(audio_path)
    finally:
        if audio_path:
            try:
                Path(audio_path).unlink(missing_ok=True)
            except OSError:
                pass


