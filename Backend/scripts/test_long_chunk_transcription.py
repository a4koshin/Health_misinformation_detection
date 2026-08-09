#!/usr/bin/env python3
"""Verify sequential chunk coverage on 5+ minutes of audio."""

from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.transcription_service import (  # noqa: E402
    CHUNK_HOP_S,
    UNCLEAR_CHUNK_MARKER,
    _clean_transcript,
    _split_wav_chunks,
    _wav_duration_seconds,
    transcribe_audio,
)

SOURCE = Path("/tmp/somali_test_speech.wav")
LONG_WAV = Path("/tmp/somali_5min_chunk_test.wav")


def _assert_noise_tags_stripped() -> None:
    raw = "qofkan (cbc) waa dhakhtar (cs) (cdhig) (cbrin) tallaalka"
    cleaned = _clean_transcript(raw)
    for tag in ("(cbc)", "(cs)", "(cdhig)", "(cbrin)"):
        if tag in cleaned:
            raise SystemExit(f"FAIL: noise tag leaked after clean: {tag!r} in {cleaned!r}")
    if "qofkan" not in cleaned or "tallaalka" not in cleaned:
        raise SystemExit(f"FAIL: real words stripped: {cleaned!r}")
    print("PASS: (cbc)/(cs)/(cdhig)/(cbrin) stripped; wording kept.")


def _ensure_long_wav() -> Path:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing source wav: {SOURCE}")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "12",
            "-i",
            str(SOURCE),
            "-t",
            "330",
            "-ar",
            "16000",
            "-ac",
            "1",
            str(LONG_WAV),
        ],
        check=True,
        capture_output=True,
    )
    return LONG_WAV


def main() -> int:
    _assert_noise_tags_stripped()
    wav = _ensure_long_wav()
    duration = _wav_duration_seconds(wav)
    planned = list(_split_wav_chunks(wav))
    for _i, _s, _d, path in planned:
        Path(path).unlink(missing_ok=True)
    expected = math.ceil(duration / CHUNK_HOP_S - 1e-9)
    print(
        f"planned duration={duration:.2f}s chunks={len(planned)} "
        f"expected_ceil={expected} hop={CHUNK_HOP_S}s"
    )
    if duration < 300:
        raise SystemExit("FAIL: test audio is under 5 minutes")
    if len(planned) != expected:
        raise SystemExit(
            f"FAIL: planned chunks {len(planned)} != ceil(duration/hop) {expected}"
        )

    text = transcribe_audio(str(wav))
    leaked = [token for token in ("[chunk", "chunk 1", "chunk_003", "DEBUG") if token in text]
    if leaked:
        raise SystemExit(f"FAIL: debug markers in user text: {leaked} → {text[:200]!r}")
    if "(cbc)" in text or "(cs)" in text:
        raise SystemExit(f"FAIL: noise parens in user text: {text[:240]!r}")

    print("--- user-facing transcript (truncated) ---")
    print(text[:500] + ("…" if len(text) > 500 else ""))
    print(f"unclear markers: {text.count(UNCLEAR_CHUNK_MARKER)}")
    print("PASS: full duration chunked; no chunk/debug labels in user text.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
