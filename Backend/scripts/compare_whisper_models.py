#!/usr/bin/env python3
"""Compare Paza vs openai/whisper-large-v3 on one audio file.

Also verifies the repetition / speaking-rate detector flags garbage instead
of silently accepting it. No LLM rewrite is used.
"""

from __future__ import annotations

import argparse
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.transcription_service import (  # noqa: E402
    BASELINE_MODEL_ID,
    HALLUCINATION_ERROR,
    TRANSCRIPTION_MODEL_ID,
    has_consecutive_repetition,
    is_likely_hallucinated,
    speaking_rate_too_high,
    transcribe_audio_with_model,
)

GARBAGE_TRANSCRIPT = (
    'qofkan wuxu ni wajigay daktore, "faircozirka, ama galaha mwaan kara, '
    "darajiri isa anigoo wax daktarati, anaa darajir ah, \"nigero, gero, "
    '"gero, wanyo, "hote, "wanyo wanyoo, "koo, waa, "bacter, "wuanyo waxa '
    'koo, koo koo uu wanyanyoii, yaathirikini na darjo, yaa darjo na daro, '
    "yao darjo kwa yi darjo. yaani, yaanyo, kwa darjo nairobi, yaaliyeyote, "
    'yaajirikine, "ifanyanyanyu" "ifanya, sani, sifanyo" "afanya, mfanyo '
    'nafanyi" "mfanyati yafanka, "mifanyati wa sifanya" "sifanya", '
    '"ifanati yaifanyali" "kifanyato" "ofanyanyukoto" "hanyanyikisha" '
    '"mafanyoo" "asafanyo "fanya" nafanya "fajati yau na kwanza kweniyo '
    "na kwee kweni na kinyi na njia kwenikisha kweniki na kibadhi na kikisha "
    "na kipandhi na nja kwenutoka kwenia kwa mwanzo na nje na kifaa kwenisho "
    "na mwana kwenya na kufaa kwanikisha mwathiriki na mwanza na kisidai "
    "na kumwanzia na kutoka na kitu na kukwanzania na kakwa kwa kwanzia "
    "kwaniki na nji na kujitaji na kama kwenjia na wanyama hili wa kaza "
    "hali ari wa kisha hali zaidi wa kwanza hali wanyanyama na hali aliki "
    "ya hali kama ya hili ya hindi ya hilo ya hivyo ya hivi ya hihi ya "
    "hilibini ya huduma ya hizi ya hiki ya kama yi ya hiti ya hizuri ya "
    "hichoaka wa kawa mbaki wa kukwake wa kikwake na kukwa mba na kutha "
    "na kwanja na kikwa mwezi wa kisumu na kisuma na kibaki wa mwaka wa "
    "mbaa na kinyi na kitu na kata na kumok na kawa na kipandamu na kake "
    "mwisho ya safi wake, hau mwishi wa kiswahili wa nana."
)

CLEAN_SOMALI = (
    "Qofkan wuxuu wajiga u yahay dhakhtar. Tallaalka COVID-19 wuu ammaan yahay."
)


def _duration_seconds(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as handle:
            rate = handle.getframerate() or 1
            return handle.getnframes() / float(rate)
    except Exception:
        return 0.0


def _ensure_wav(path: Path) -> Path:
    suffix = path.suffix.lower()
    if suffix == ".wav":
        return path
    from services.transcription_service import normalize_audio_to_wav

    wav = Path(normalize_audio_to_wav(str(path)))
    return wav


def _download_somali_sample(dest: Path) -> Path | None:
    """Fetch one short Somali FLEURS clip if datasets + network are available."""
    try:
        from datasets import Audio, load_dataset
    except ImportError:
        print("[compare] datasets not installed; pass --audio PATH")
        return None

    try:
        stream = load_dataset(
            "google/fleurs",
            "so_so",
            split="test",
            streaming=True,
            trust_remote_code=True,
        )
        sample = next(iter(stream.cast_column("audio", Audio(sampling_rate=16000))))
        audio = sample["audio"]
        array = audio["array"]
        rate = int(audio["sampling_rate"])
        import numpy as np

        pcm = np.asarray(array)
        pcm = (pcm * 32767.0).clip(-32768, 32767).astype("<i2")
        dest.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(dest), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(rate)
            handle.writeframes(pcm.tobytes())
        print(f"[compare] downloaded FLEURS Somali sample → {dest}")
        return dest
    except Exception as exc:  # noqa: BLE001
        print(f"[compare] could not download FLEURS Somali sample: {exc}")
        return None


def _print_detector_self_test() -> None:
    print("=" * 72)
    print("REPETITION DETECTOR (no audio)")
    print("=" * 72)
    garbage_flag = is_likely_hallucinated(GARBAGE_TRANSCRIPT, duration_seconds=20.0)
    clean_flag = is_likely_hallucinated(CLEAN_SOMALI, duration_seconds=6.0)
    print(f"garbage consecutive-repeat : {has_consecutive_repetition(GARBAGE_TRANSCRIPT)}")
    print(f"garbage speaking-rate      : {speaking_rate_too_high(GARBAGE_TRANSCRIPT, 20.0)}")
    print(f"garbage is_likely_halluc.  : {garbage_flag}  (must be True → reject)")
    print(f"clean   is_likely_halluc.  : {clean_flag}  (must be False → keep)")
    print(f"user-facing error          : {HALLUCINATION_ERROR}")
    if not garbage_flag:
        raise SystemExit("FAIL: garbage transcript was NOT flagged")
    if clean_flag:
        raise SystemExit("FAIL: clean Somali was flagged as hallucination")
    print("PASS: detector rejects garbage and keeps clean Somali.\n")


def _print_side_by_side(paza_text: str, base_text: str, duration: float) -> None:
    print("=" * 72)
    print("SIDE-BY-SIDE TRANSCRIPTION")
    print("=" * 72)
    print(f"audio duration : {duration:.2f}s")
    print()
    print(f"--- {TRANSCRIPTION_MODEL_ID} (production) ---")
    print(paza_text or "(empty)")
    print(f"hallucinated? {is_likely_hallucinated(paza_text, duration)}")
    print()
    print(f"--- {BASELINE_MODEL_ID} (comparison only) ---")
    print(base_text or "(empty)")
    print(f"hallucinated? {is_likely_hallucinated(base_text, duration)}")
    print()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", type=Path, help="WAV/MP3/M4A/MP4 to compare")
    args = parser.parse_args()

    _print_detector_self_test()

    audio_path = args.audio
    tmp_download: Path | None = None
    owned_wav: Path | None = None

    if audio_path is None:
        tmp_download = Path(tempfile.gettempdir()) / "somali_fleurs_sample.wav"
        audio_path = _download_somali_sample(tmp_download)

    if audio_path is None or not audio_path.is_file():
        print("No test audio available. Re-run with: python scripts/compare_whisper_models.py --audio /path/to/file.wav")
        return 0

    wav_path = _ensure_wav(audio_path.resolve())
    if wav_path != audio_path.resolve():
        owned_wav = wav_path
    duration = _duration_seconds(wav_path)
    print(f"[compare] audio={wav_path} duration={duration:.2f}s\n")

    print(f"[compare] running {TRANSCRIPTION_MODEL_ID} …")
    paza_text = transcribe_audio_with_model(str(wav_path), TRANSCRIPTION_MODEL_ID)
    print(f"[compare] running {BASELINE_MODEL_ID} …")
    base_text = transcribe_audio_with_model(str(wav_path), BASELINE_MODEL_ID)

    _print_side_by_side(paza_text, base_text, duration)

    if owned_wav is not None:
        owned_wav.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
