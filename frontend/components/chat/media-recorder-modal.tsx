"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassModal } from "@/components/glass/glass-modal";
import { MaterialIcon } from "@/components/ui/material-icon";

type RecordKind = "audio" | "video";

function pickMimeType(kind: RecordKind) {
  const candidates =
    kind === "video"
      ? [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ]
      : [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg",
        ];

  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "";
}

function extensionForMime(mime: string, kind: RecordKind) {
  if (mime.includes("mp4")) return kind === "video" ? "mp4" : "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function MediaRecorderModal({
  open,
  kind,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  kind: RecordKind | null;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File, kind: RecordKind) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasStream, setHasStream] = useState(false);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setHasStream(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function resetRecorder() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsed(0);
    stopTracks();
  }

  useEffect(() => {
    if (!open || !kind) {
      resetRecorder();
      setError(null);
      return;
    }

    let cancelled = false;

    async function prepare() {
      setIsStarting(true);
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          kind === "video"
            ? { audio: true, video: { facingMode: "user" } }
            : { audio: true },
        );
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setHasStream(true);
        if (kind === "video" && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setHasStream(false);
          setError(
            kind === "video"
              ? "Camera/microphone permission is required to record video."
              : "Microphone permission is required to record audio.",
          );
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    }

    void prepare();

    return () => {
      cancelled = true;
      resetRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  function startRecording() {
    if (!kind || !streamRef.current) return;

    const mimeType = pickMimeType(kind);
    try {
      const recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || (kind === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
          toast.error("Nothing was recorded. Try again.");
          stopTracks();
          setIsRecording(false);
          return;
        }
        const file = new File(
          [blob],
          `healthai-${kind}-${Date.now()}.${extensionForMime(type, kind)}`,
          { type },
        );
        onCapture(file, kind);
        onOpenChange(false);
        stopTracks();
        setIsRecording(false);
        setElapsed(0);
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setElapsed(0);
    } catch {
      toast.error("Unable to start recording on this device.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  function handleClose(next: boolean) {
    if (!next) {
      resetRecorder();
    }
    onOpenChange(next);
  }

  if (!kind) return null;

  return (
    <GlassModal
      open={open}
      onOpenChange={handleClose}
      title={kind === "video" ? "Record video" : "Record audio"}
      description={
        kind === "video"
          ? "Capture a short video claim, then HealthAI will transcribe and analyze it."
          : "Capture a short audio claim, then HealthAI will transcribe and analyze it."
      }
      className="max-w-md"
    >
      <div className="space-y-4">
        {kind === "video" ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-ink">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-video w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-[#ffefe6] px-4 py-10">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand shadow-sm">
              <MaterialIcon
                name={isRecording ? "graphic_eq" : "mic"}
                size={28}
              />
            </span>
            <p className="text-sm text-ink-muted">
              {isStarting
                ? "Starting microphone…"
                : isRecording
                  ? "Listening…"
                  : "Ready to record"}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-ink-muted">
            {error
              ? error
              : isStarting
                ? "Requesting device access…"
                : isRecording
                  ? "Recording in progress"
                  : "Press start when ready"}
          </p>
          <p className="font-mono text-sm font-medium text-ink">
            {formatElapsed(elapsed)}
          </p>
        </div>

        {error ? (
          <GlassButton
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => handleClose(false)}
          >
            Close
          </GlassButton>
        ) : (
          <div className="flex gap-3">
            <GlassButton
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => handleClose(false)}
            >
              Cancel
            </GlassButton>
            {isRecording ? (
              <GlassButton
                type="button"
                className="flex-1 bg-red-600 bg-none hover:bg-red-700"
                onClick={stopRecording}
              >
                <MaterialIcon name="stop" size={18} />
                Stop & use
              </GlassButton>
            ) : (
              <GlassButton
                type="button"
                className="flex-1"
                disabled={isStarting || !hasStream}
                onClick={startRecording}
              >
                <MaterialIcon name="fiber_manual_record" size={18} />
                Start
              </GlassButton>
            )}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
