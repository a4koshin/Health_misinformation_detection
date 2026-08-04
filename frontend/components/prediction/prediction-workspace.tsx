"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MediaRecorderModal } from "@/components/chat/media-recorder-modal";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassLabel,
  GlassSelect,
} from "@/components/glass/glass-input";
import {
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { predictDataset } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { getConversation, getHistory } from "@/lib/history";
import {
  predictMedia,
  predictText,
  transcribeVideo,
  type MediaPredictionResponse,
  type TextPredictionResponse,
} from "@/lib/predict";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const FILE_ACCEPT =
  ".txt,.csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac";
const VIDEO_ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi";

type AnalysisResult = {
  claim: string;
  label: string;
  topic: string | null;
  confidence: number | null;
  risk: string;
  somaliReply: string;
  source: string;
};

function displayLabel(label: string | null | undefined) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
}

function labelTone(label: string | null | undefined) {
  const value = displayLabel(label);
  if (value === "Reliable") return "success" as const;
  if (value === "Non-Reliable") return "danger" as const;
  return "neutral" as const;
}

function riskFromLabel(label: string, isMedical: boolean) {
  if (!isMedical || label === "Non-medical") return "None";
  if (label === "Reliable") return "Low";
  if (label === "Non-Reliable" || label === "Misinformation") return "High";
  return "—";
}

function formatConfidence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = value <= 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

function formatPredictionId(id: string) {
  const numeric = Number(id);
  if (Number.isFinite(numeric)) {
    return `PR-${String(numeric).padStart(4, "0")}`;
  }
  return `PR-${id}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function claimText(item: Detection) {
  return item.claim_text || item.input_text || "";
}

function toAnalysisResult(
  response: TextPredictionResponse | MediaPredictionResponse,
  claim: string,
  source = "Manual check",
): AnalysisResult {
  const label = displayLabel(
    response.label || (response.is_medical ? "Pending" : "Non-medical"),
  );
  return {
    claim,
    label,
    topic: response.topic,
    confidence: response.label_confidence,
    risk: riskFromLabel(label, response.is_medical),
    somaliReply: response.message,
    source,
  };
}

export function PredictionWorkspace() {
  const { token } = useAuth();
  const historyRevision = useChatStore((state) => state.historyRevision);
  const bumpHistory = () =>
    useChatStore.setState((state) => ({
      historyRevision: state.historyRevision + 1,
    }));

  const [draft, setDraft] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [mediaBusyLabel, setMediaBusyLabel] = useState<string | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recorderKind, setRecorderKind] = useState<"audio" | "video" | null>(
    null,
  );
  const [inputMode, setInputMode] = useState<
    "text" | "audio" | "video" | "file"
  >("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) {
        if (active) {
          setHistory([]);
          setIsLoadingHistory(false);
        }
        return;
      }

      setIsLoadingHistory(true);
      try {
        const items = await getHistory(token);
        if (active) setHistory(Array.isArray(items) ? items : []);
      } catch {
        if (active) {
          setHistory([]);
          toast.error("Unable to load previous predictions.");
        }
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  const pagination = useTablePagination(history, 10);

  async function analyzeClaim(text: string) {
    if (!token) return;
    const claim = text.trim();
    if (!claim) {
      toast.error("Enter a health claim to analyze.");
      return;
    }
    if (claim.length > MAX_CHARS) {
      toast.error(`Claim must be ${MAX_CHARS} characters or fewer.`);
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await predictText(token, claim);
      setResult(toAnalysisResult(response, claim));
      bumpHistory();
      toast.success("Claim analyzed.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to analyze this claim.";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyze() {
    await analyzeClaim(draft);
  }

  function handleClear() {
    setDraft("");
    setResult(null);
  }

  async function handleFileUpload(file: File) {
    if (!token || isAnalyzing) return;

    const lower = file.name.toLowerCase();
    const isText = lower.endsWith(".txt") || file.type === "text/plain";
    const isDataset =
      lower.endsWith(".csv") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsm") ||
      lower.endsWith(".xltx") ||
      lower.endsWith(".xltm");

    if (isText) {
      setIsAnalyzing(true);
      try {
        const content = (await file.text()).trim();
        if (!content) {
          toast.error("The text file is empty.");
          return;
        }
        const clipped = content.slice(0, MAX_CHARS);
        setDraft(clipped);
        await analyzeClaim(clipped);
      } catch {
        toast.error("Unable to read that text file.");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (isDataset) {
      setIsAnalyzing(true);
      try {
        const dataset = await predictDataset(token, file);
        bumpHistory();
        toast.success(
          `Dataset done — ${dataset.reliable_count} Reliable, ${dataset.misinformation_count} Non-Reliable.`,
        );
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to process dataset.";
        toast.error(message);
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    toast.error("Upload a .txt, .csv, or .xlsx file.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleMediaUpload(file: File, kind: "audio" | "video") {
    if (!token || isAnalyzing) return;

    setIsAnalyzing(true);
    setMediaBusyLabel(
      kind === "video"
        ? "Transcribing video…"
        : "Transcribing audio…",
    );
    try {
      if (kind === "video") {
        // Video → /api/transcribe → same /api/predict pipeline as typed text.
        const { transcribed_text } = await transcribeVideo(token, file);
        const claim = (transcribed_text || "").trim();
        if (!claim) {
          toast.error("No speech could be transcribed from that video.");
          return;
        }
        const clipped = claim.slice(0, MAX_CHARS);
        setDraft(clipped);
        setMediaBusyLabel("Analyzing claim…");
        const response = await predictText(token, clipped);
        setResult(toAnalysisResult(response, clipped, "Video upload"));
        bumpHistory();
        toast.success(
          response.label
            ? `Done — labeled ${displayLabel(response.label)}.`
            : "Done — video claim analyzed.",
        );
        return;
      }

      const response = await predictMedia(token, file, kind);
      const claim = (response.transcript || "").trim();
      if (!claim) {
        toast.error("No speech could be transcribed from that file.");
        return;
      }
      const clipped = claim.slice(0, MAX_CHARS);
      setDraft(clipped);
      setResult(
        toAnalysisResult(
          response,
          clipped,
          "Audio upload",
        ),
      );
      bumpHistory();
      toast.success(
        response.label
          ? `Done — labeled ${displayLabel(response.label)}.`
          : "Done — media claim analyzed.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : `Unable to process ${kind} file.`;
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
      setMediaBusyLabel(null);
      if (kind === "audio" && audioInputRef.current) {
        audioInputRef.current.value = "";
      }
      if (kind === "video" && videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  }

  function openRecorder(kind: "audio" | "video") {
    setRecorderKind(kind);
    setRecorderOpen(true);
  }

  async function openHistoryItem(item: Detection) {
    if (!token) return;
    const claim = claimText(item);
    const label = displayLabel(item.label);
    setDraft(claim);

    let somaliReply =
      "Re-analyze this claim to refresh the Somali reply.";
    try {
      const conversation = await getConversation(token, item.id);
      const assistant = conversation.messages?.find((m) => m.role === "assistant");
      if (assistant?.content) {
        somaliReply = assistant.content;
      }
    } catch {
      // Fall back to placeholder reply.
    }

    setResult({
      claim,
      label,
      topic: item.topic ?? null,
      confidence: item.label_confidence ?? item.confidence,
      risk: riskFromLabel(label, item.is_medical ?? label !== "Non-medical"),
      somaliReply,
      source: item.source || "Manual check",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const charCount = draft.length;

  return (
    <PrivatePage
      title="Check a claim"
      description="Paste Somali health text, or bring audio, video, or a dataset — SomAI runs medical gatekeeping, reliability, and topic classification."
      className="w-full max-w-none gap-5 sm:gap-6"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFileUpload(file);
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleMediaUpload(file, "audio");
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleMediaUpload(file, "video");
        }}
      />

      {/* Pipeline identity */}
      <section className="overflow-hidden rounded-2xl border border-brand/15 bg-gradient-to-r from-[#ffefe6] via-white to-white px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
              Detection pipeline
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Three stages — only medical claims reach reliability and topic models.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink">
            <PipelineStep icon="health_and_safety" label="Medical gate" />
            <span className="text-ink/25" aria-hidden="true">
              →
            </span>
            <PipelineStep icon="verified" label="Reliable / Non-Reliable" />
            <span className="text-ink/25" aria-hidden="true">
              →
            </span>
            <PipelineStep icon="category" label="Topic" />
          </div>
        </div>
      </section>

      {/* Composer */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_24px_-20px_rgba(15,23,42,0.35)]">
        <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50/80 p-1.5 sm:p-2">
          {(
            [
              { id: "text", icon: "edit_note", label: "Text" },
              { id: "audio", icon: "mic", label: "Audio" },
              { id: "video", icon: "videocam", label: "Video" },
              { id: "file", icon: "upload_file", label: "Dataset" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              disabled={isAnalyzing}
              onClick={() => setInputMode(mode.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                inputMode === mode.id
                  ? "bg-white text-brand shadow-sm ring-1 ring-black/5"
                  : "text-ink-muted hover:bg-white/70 hover:text-ink",
              )}
            >
              <MaterialIcon name={mode.icon} size={18} />
              {mode.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          {inputMode === "text" ? (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="claim-input"
                  className="text-sm font-medium text-ink"
                >
                  Somali health claim
                </label>
                <div className="relative">
                  <textarea
                    id="claim-input"
                    value={draft}
                    onChange={(event) =>
                      setDraft(event.target.value.slice(0, MAX_CHARS))
                    }
                    rows={6}
                    disabled={isAnalyzing}
                    placeholder="Tusaale: Tallaalka COVID-19 wuu ammaan yahay…"
                    className="min-h-[140px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] leading-6 text-ink outline-none transition-shadow placeholder:text-ink-muted/70 focus:border-brand/40 focus:ring-3 focus:ring-brand/15 disabled:opacity-60"
                  />
                  <p className="pointer-events-none absolute right-3 bottom-3 text-[11px] tabular-nums text-ink-muted">
                    {charCount}/{MAX_CHARS}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <GlassButton
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={isAnalyzing || !draft.trim()}
                  className="bg-brand bg-none hover:bg-[#e65300]"
                >
                  {isAnalyzing && !mediaBusyLabel ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <MaterialIcon name="fact_check" size={18} />
                  )}
                  Run detection
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="ghost"
                  disabled={isAnalyzing || (!draft && !result)}
                  onClick={handleClear}
                >
                  Clear
                </GlassButton>
              </div>
            </>
          ) : null}

          {inputMode === "audio" ? (
            <MediaModePanel
              title="Audio claim"
              description="Upload a recording or capture speech with your microphone. SomAI transcribes it, then runs the same detection pipeline."
              busyLabel={mediaBusyLabel}
              disabled={isAnalyzing}
              primaryLabel="Upload audio"
              primaryIcon="audio_file"
              onPrimary={() => audioInputRef.current?.click()}
              secondaryLabel="Record audio"
              secondaryIcon="mic"
              onSecondary={() => openRecorder("audio")}
            />
          ) : null}

          {inputMode === "video" ? (
            <MediaModePanel
              title="Video claim"
              description="Upload or record a short video. Audio is extracted and transcribed to Somali, then classified with the full pipeline."
              busyLabel={mediaBusyLabel}
              disabled={isAnalyzing}
              primaryLabel="Upload video"
              primaryIcon="videocam"
              onPrimary={() => videoInputRef.current?.click()}
              secondaryLabel="Record video"
              secondaryIcon="video_camera_front"
              onSecondary={() => openRecorder("video")}
            />
          ) : null}

          {inputMode === "file" ? (
            <MediaModePanel
              title="Batch dataset"
              description="Upload a .txt claim file, or a CSV / Excel sheet for batch labeling."
              busyLabel={isAnalyzing ? "Processing file…" : null}
              disabled={isAnalyzing}
              primaryLabel="Upload .txt / .csv / .xlsx"
              primaryIcon="upload_file"
              onPrimary={() => fileInputRef.current?.click()}
            />
          ) : null}
        </div>
      </section>

      {/* Verdict */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border transition-colors",
          result
            ? result.label === "Reliable"
              ? "border-emerald-500/25 bg-gradient-to-b from-emerald-50/80 to-white"
              : result.label === "Non-Reliable"
                ? "border-red-500/25 bg-gradient-to-b from-red-50/70 to-white"
                : "border-slate-200 bg-gradient-to-b from-slate-50 to-white"
            : "border-dashed border-gray-200 bg-white",
        )}
      >
        {!result ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center sm:py-16">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <MaterialIcon name="policy" size={26} />
            </span>
            <div className="max-w-md space-y-1">
              <p className="text-base font-medium text-ink">
                Verdict appears here
              </p>
              <p className="text-sm leading-6 text-ink-muted">
                After you run detection, you&apos;ll see the label, confidence,
                topic (when Reliable), risk level, and a Somali explanation.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-[fade-up_0.35s_ease-out]">
            <div className="flex flex-col gap-4 border-b border-black/[0.04] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
              <div className="min-w-0 space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
                  Verdict
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <GlassBadge
                    tone={labelTone(result.label)}
                    className="px-3 py-1 text-sm"
                  >
                    <MaterialIcon
                      name={
                        result.label === "Reliable"
                          ? "verified"
                          : result.label === "Non-Reliable"
                            ? "report"
                            : "info"
                      }
                      size={16}
                    />
                    {result.label}
                  </GlassBadge>
                  {result.topic ? (
                    <span className="inline-flex items-center rounded-full border border-brand/20 bg-[#ffefe6] px-3 py-1 text-xs font-medium text-brand-deep">
                      {result.topic}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-ink-muted">
                    Risk: {result.risk}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-ink-muted">
                    {result.source}
                  </span>
                </div>
              </div>

              {result.confidence != null &&
              result.label !== "Non-medical" &&
              !(result.confidence === 0) ? (
                <div className="min-w-[132px] rounded-2xl border border-black/5 bg-white/90 px-4 py-3">
                  <p className="text-[11px] font-medium text-ink-muted">
                    Confidence
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
                    {formatConfidence(result.confidence)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                  Claim
                </p>
                <p className="text-sm leading-6 text-ink">{result.claim}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                  Somali reply
                </p>
                <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm leading-6 text-ink whitespace-pre-wrap">
                  {result.somaliReply}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-black/[0.04] px-4 py-3 sm:px-6">
              <GlassButton
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClear}
              >
                Check another claim
              </GlassButton>
            </div>
          </div>
        )}
      </section>

      {/* Recent checks */}
      <DataTableCard
        className="min-w-0 shrink-0 rounded-2xl [&_>div:first-child]:px-4 [&_>div:first-child]:py-3.5 sm:[&_>div:first-child]:px-5"
        tableClassName="table-fixed w-full text-[13px]"
        header={
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-ink">Recent checks</h2>
              <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                Tap a row to reload that claim and verdict above.
              </p>
            </div>
            <div className="w-full max-w-[120px] space-y-1 sm:shrink-0">
              <GlassLabel htmlFor="prediction-rows">Rows</GlassLabel>
              <GlassSelect
                id="prediction-rows"
                value={String(pagination.rowsPerPage)}
                onChange={(event) =>
                  pagination.setRowsPerPage(Number(event.target.value))
                }
                className="h-9 rounded-lg bg-white text-sm"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </GlassSelect>
            </div>
          </div>
        }
        footer={
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            pageNumbers={pagination.pageNumbers}
            onPageChange={pagination.setPage}
            className="px-4 py-3 sm:px-5"
          />
        }
      >
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[38%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
        </colgroup>
        <GlassTableHead>
          <GlassTableRow>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              ID
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              Claim
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              Label
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              Topic
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              Confidence
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="px-3 sm:px-4">
              Date
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoadingHistory ? (
            Array.from({ length: 5 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={6} className="px-3 sm:px-4">
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={6} className="px-3 sm:px-4">
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <MaterialIcon
                    name="history"
                    size={28}
                    className="text-brand-light"
                  />
                  <p className="text-sm font-medium text-ink">
                    No checks yet
                  </p>
                  <p className="text-sm text-ink-muted">
                    Run detection to build your history here.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => {
              const label = displayLabel(item.label);
              return (
                <GlassTableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => void openHistoryItem(item)}
                >
                  <GlassTableCell className="px-3 font-medium tabular-nums text-ink-muted sm:px-4">
                    {formatPredictionId(item.id)}
                  </GlassTableCell>
                  <GlassTableCell className="px-3 sm:px-4">
                    <p className="truncate text-ink" title={claimText(item)}>
                      {claimText(item)}
                    </p>
                  </GlassTableCell>
                  <GlassTableCell className="px-3 sm:px-4">
                    <GlassBadge
                      tone={labelTone(label)}
                      className="max-w-full truncate px-2.5"
                    >
                      {label}
                    </GlassBadge>
                  </GlassTableCell>
                  <GlassTableCell className="truncate px-3 text-ink-muted sm:px-4">
                    {item.topic || "—"}
                  </GlassTableCell>
                  <GlassTableCell className="px-3 tabular-nums text-ink-muted sm:px-4">
                    {formatConfidence(item.label_confidence ?? item.confidence)}
                  </GlassTableCell>
                  <GlassTableCell className="px-3 whitespace-nowrap text-ink-muted sm:px-4">
                    {formatDate(item.created_at)}
                  </GlassTableCell>
                </GlassTableRow>
              );
            })
          )}
        </GlassTableBody>
      </DataTableCard>

      <MediaRecorderModal
        open={recorderOpen}
        kind={recorderKind}
        onOpenChange={(open) => {
          setRecorderOpen(open);
          if (!open) setRecorderKind(null);
        }}
        onCapture={(file, kind) => {
          void handleMediaUpload(file, kind);
        }}
      />
    </PrivatePage>
  );
}

function PipelineStep({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-2.5 py-1 shadow-sm">
      <MaterialIcon name={icon} size={14} className="text-brand" />
      {label}
    </span>
  );
}

function MediaModePanel({
  title,
  description,
  busyLabel,
  disabled,
  primaryLabel,
  primaryIcon,
  onPrimary,
  secondaryLabel,
  secondaryIcon,
  onSecondary,
}: {
  title: string;
  description: string;
  busyLabel: string | null;
  disabled: boolean;
  primaryLabel: string;
  primaryIcon: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  secondaryIcon?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 sm:px-6">
      <div className="max-w-xl space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <GlassButton
          type="button"
          disabled={disabled}
          onClick={onPrimary}
          className="bg-brand bg-none hover:bg-[#e65300]"
        >
          <MaterialIcon name={primaryIcon} size={18} />
          {primaryLabel}
        </GlassButton>
        {secondaryLabel && onSecondary && secondaryIcon ? (
          <GlassButton
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onSecondary}
          >
            <MaterialIcon name={secondaryIcon} size={18} />
            {secondaryLabel}
          </GlassButton>
        ) : null}
      </div>
      {busyLabel ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          {busyLabel}
        </p>
      ) : null}
    </div>
  );
}
