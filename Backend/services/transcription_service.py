"""Somali audio/video → text (Paza Whisper) with anti-hallucination checks.

microsoft/paza-whisper-large-v3-turbo is the production ASR model.
Raw model output is returned as-is when it passes quality checks. Garbage
(repetition loops, impossible speaking rate) is rejected — never rewritten
by an LLM, which would invent claims for the classifier.
"""

from __future__ import annotations

import os
import re
import tempfile
import threading
import wave
from pathlib import Path

# Cached ASR pipeline — loaded once on first transcribe, reused after that.
_asr_pipeline = None
_asr_lock = threading.Lock()

TRANSCRIPTION_MODEL_ID = "microsoft/paza-whisper-large-v3-turbo"
BASELINE_MODEL_ID = "openai/whisper-large-v3"

HALLUCINATION_ERROR = "Codka lama fahmin si sax ah, fadlan isku day mar kale"

# openai-whisper name → Hugging Face Whisper generate() name
# condition_on_previous_text=False stops each chunk from priming the next
# with hallucinated tokens (the main Swahili-loop failure mode).
# One greedy pass. Temperature fallback lists retry each chunk up to 6× and
# blow past the browser timeout on CPU (2–4 min for ~2 min of audio).
ANTI_HALLUCINATION_GENERATE_KWARGS = {
    "language": "so",
    "task": "transcribe",
    "condition_on_prev_tokens": False,  # HF equivalent of condition_on_previous_text
    "do_sample": False,
    "num_beams": 1,
    "temperature": 0.0,
}

CHUNK_LENGTH_S = 30.0
# Sequential hop = full chunk so coverage is exact (no silent truncation).
CHUNK_HOP_S = 30.0
MAX_CONSECUTIVE_REPEATS = 3
MAX_WORDS_PER_SECOND = 3.0
UNCLEAR_CHUNK_MARKER = "[audio unclear here]"

_WHISPER_SPECIAL_TOKEN_RE = re.compile(r"<\|[^|>]*\|>")
_ARABIC_SCRIPT_RE = re.compile(
    r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+"
)
# Paza/Whisper hallucinated codes — not added by our chunker. Seen in the wild:
# (cs) (cbc) (cdhig) (cbrin). Strip letter-only parentheticals up to 8 chars.
_WHISPER_NOISE_PAREN_RE = re.compile(r"\(\s*[A-Za-z]{1,8}\s*\)")
_WORD_RE = re.compile(r"[A-Za-z']+")
_SYLLABLE_RE = re.compile(r"[^aeiou]*[aeiou]+[^aeiou]*|[a-z]+", re.IGNORECASE)


def _clean_transcript(text: str) -> str:
    """Strip Whisper tokens / Arabic / hallucinated (cbc)-style tags. No rewrite."""
    cleaned = _WHISPER_SPECIAL_TOKEN_RE.sub(" ", text or "")
    cleaned = _ARABIC_SCRIPT_RE.sub(" ", cleaned)
    cleaned = _WHISPER_NOISE_PAREN_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _normalize_token(token: str) -> str:
    return re.sub(r"[^a-z]+", "", token.lower())


def _syllables(word: str) -> list[str]:
    return [part.lower() for part in _SYLLABLE_RE.findall(word) if part]


def _has_run_longer_than(tokens: list[str], max_run: int) -> bool:
    run = 1
    for index in range(1, len(tokens)):
        if tokens[index] and tokens[index] == tokens[index - 1]:
            run += 1
            if run > max_run:
                return True
        else:
            run = 1
    return False


def has_consecutive_repetition(text: str, max_run: int = MAX_CONSECUTIVE_REPEATS) -> bool:
    """True when more than `max_run` identical words or syllables appear in a row."""
    words = [_normalize_token(token) for token in _WORD_RE.findall(text or "")]
    words = [word for word in words if word]
    if _has_run_longer_than(words, max_run):
        return True

    syllables: list[str] = []
    for word in words:
        parts = _syllables(word)
        syllables.extend(parts if parts else [word])
    return _has_run_longer_than(syllables, max_run)


def speaking_rate_too_high(text: str, duration_seconds: float) -> bool:
    """True when transcript density exceeds a sustainable ~3 words/sec."""
    if duration_seconds <= 0:
        return False
    word_count = len(_WORD_RE.findall(text or ""))
    if word_count < 8:
        return False
    return (word_count / duration_seconds) > MAX_WORDS_PER_SECOND


def is_likely_hallucinated(text: str, duration_seconds: float = 0.0) -> bool:
    """Quality gate: repetition loops or impossible words-per-second."""
    cleaned = _clean_transcript(text)
    if not cleaned:
        return False
    if has_consecutive_repetition(cleaned):
        return True
    return speaking_rate_too_high(cleaned, duration_seconds)


def _wav_duration_seconds(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as handle:
            rate = handle.getframerate() or 1
            return handle.getnframes() / float(rate)
    except Exception:
        return 0.0


def _raise_if_hallucinated(text: str, duration_seconds: float) -> None:
    if is_likely_hallucinated(text, duration_seconds):
        print(
            "[whisper] rejected hallucinated transcript "
            f"(duration={duration_seconds:.1f}s words={len(_WORD_RE.findall(text))})"
        )
        raise RuntimeError(HALLUCINATION_ERROR)


def _split_wav_chunks(wav_path: Path, chunk_s: float = CHUNK_LENGTH_S, hop_s: float = CHUNK_HOP_S):
    """Yield sequential (index, start_s, duration_s, temp_wav_path) covering the file."""
    with wave.open(str(wav_path), "rb") as src:
        rate = src.getframerate() or 1
        channels = src.getnchannels()
        sampwidth = src.getsampwidth()
        total_frames = src.getnframes()
        frames_per_chunk = max(1, int(rate * chunk_s))
        hop_frames = max(1, int(rate * hop_s))

        index = 0
        start_frame = 0
        while start_frame < total_frames:
            src.setpos(start_frame)
            frames = src.readframes(frames_per_chunk)
            frame_count = len(frames) // max(1, sampwidth * channels)
            if frame_count <= 0:
                break
            duration = frame_count / float(rate)
            fd, chunk_path = tempfile.mkstemp(suffix=f".chunk{index:03d}.wav")
            os.close(fd)
            with wave.open(chunk_path, "wb") as dst:
                dst.setnchannels(channels)
                dst.setsampwidth(sampwidth)
                dst.setframerate(rate)
                dst.writeframes(frames)
            yield index, start_frame / float(rate), duration, chunk_path
            index += 1
            start_frame += hop_frames


def _transcribe_one_chunk(asr, chunk_path: str) -> str:
    """Transcribe a single ≤30s clip. No pipeline chunking; no timestamps needed."""
    generate_kwargs = dict(ANTI_HALLUCINATION_GENERATE_KWARGS)
    try:
        result = asr(
            chunk_path,
            generate_kwargs=generate_kwargs,
            return_timestamps=False,
        )
    except TypeError:
        result = asr(chunk_path, generate_kwargs=generate_kwargs)
    if isinstance(result, dict):
        return (result.get("text") or "").strip()
    return str(result or "").strip()


def _build_asr_pipeline(model_id: str):
    import torch
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

    device = 0 if torch.cuda.is_available() else -1
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id)

    # language="so" must win; leftover forced_decoder_ids override it.
    if getattr(model, "generation_config", None) is not None:
        model.generation_config.forced_decoder_ids = None
        model.generation_config.task = "transcribe"
        model.generation_config.language = "so"
    if hasattr(model, "config"):
        model.config.forced_decoder_ids = None

    return pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        device=device,
        ignore_warning=True,
        generate_kwargs=dict(ANTI_HALLUCINATION_GENERATE_KWARGS),
    )


def load_transcription_model():
    """Load the production Paza ASR pipeline once."""
    global _asr_pipeline
    if _asr_pipeline is not None:
        return _asr_pipeline

    with _asr_lock:
        if _asr_pipeline is not None:
            return _asr_pipeline

        _asr_pipeline = _build_asr_pipeline(TRANSCRIPTION_MODEL_ID)
        print(f"[whisper] loaded {TRANSCRIPTION_MODEL_ID} language=so")
        return _asr_pipeline


def transcribe_audio(audio_path: str) -> str:
    """Split audio into sequential 30s chunks, gate each, then join."""
    asr = load_transcription_model()
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    duration = _wav_duration_seconds(path)
    parts: list[str] = []
    processed = 0
    rejected = 0
    coverage = 0.0
    chunk_paths: list[str] = []

    try:
        for index, start_s, chunk_dur, chunk_path in _split_wav_chunks(path):
            chunk_paths.append(chunk_path)
            processed += 1
            coverage += chunk_dur
            raw = _transcribe_one_chunk(asr, chunk_path)
            cleaned = _clean_transcript(raw)
            if not cleaned or is_likely_hallucinated(cleaned, chunk_dur):
                rejected += 1
                parts.append(UNCLEAR_CHUNK_MARKER)
                print(
                    f"[whisper] chunk {processed} "
                    f"{start_s:.1f}-{start_s + chunk_dur:.1f}s REJECTED"
                )
                continue
            parts.append(cleaned)
            print(
                f"[whisper] chunk {processed} "
                f"{start_s:.1f}-{start_s + chunk_dur:.1f}s ok chars={len(cleaned)}"
            )
    finally:
        for chunk_path in chunk_paths:
            try:
                Path(chunk_path).unlink(missing_ok=True)
            except OSError:
                pass

    print(
        f"[whisper] duration={duration:.1f}s chunks_processed={processed} "
        f"coverage={coverage:.1f}s rejected={rejected} "
        f"chunk={CHUNK_LENGTH_S:.0f}s hop={CHUNK_HOP_S:.0f}s"
    )

    if processed == 0:
        raise RuntimeError(
            "No speech was detected in this recording. Try a clearer audio file."
        )

    text = " ".join(parts).strip()
    if not text or all(part == UNCLEAR_CHUNK_MARKER for part in parts):
        raise RuntimeError(HALLUCINATION_ERROR)

    print(f"[whisper] Somali transcript ({len(text)} chars, {duration:.1f}s)")
    return text


def transcribe_audio_with_model(audio_path: str, model_id: str) -> str:
    """One-shot model comparison: same sequential chunker, no quality gate."""
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    asr = _build_asr_pipeline(model_id)
    chunk_paths: list[str] = []
    try:
        parts: list[str] = []
        for _index, _start, _dur, chunk_path in _split_wav_chunks(path):
            chunk_paths.append(chunk_path)
            parts.append(_clean_transcript(_transcribe_one_chunk(asr, chunk_path)))
        return " ".join(part for part in parts if part).strip()
    finally:
        del asr
        for chunk_path in chunk_paths:
            try:
                Path(chunk_path).unlink(missing_ok=True)
            except OSError:
                pass


def extract_audio(video_path: str) -> str:
    """Extract mono 16 kHz WAV audio from a video file via moviepy.

    Returns the path to a temporary .wav file. Caller must delete it.
    """
    try:
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
