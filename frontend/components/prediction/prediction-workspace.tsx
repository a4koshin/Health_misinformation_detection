"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { MediaRecorderModal } from "@/components/chat/media-recorder-modal";
import { GlassButton } from "@/components/glass/glass-button";
import { predictDataset } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import {
  CLAIM_INPUT_NOT_ALLOWED_MESSAGE,
  validateSomaliClaimInput,
} from "@/lib/claim-validation";
import {
  predictText,
  transcribeMedia,
  type PredictionSource,
  type TextPredictionResponse,
} from "@/lib/predict";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const FILE_ACCEPT =
  ".txt,.csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac";
const VIDEO_ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi";

const INPUT_MODES = [
  { id: "text" as const, label: "Text" },
  { id: "audio" as const, label: "Audio" },
  { id: "video" as const, label: "Video" },
  { id: "file" as const, label: "Dataset" },
];

type AnalysisResult = {
  claim: string;
  label: string;
  confidence: number | null;
  risk: string;
  somaliReply: string;
  source: string;
  sources: PredictionSource[];
  similarTerms: string[];
  model: string | null;
};

function platformLabel(platform?: string) {
  const value = (platform || "web").toLowerCase();
  if (value === "facebook") return "Facebook";
  if (value === "youtube") return "YouTube";
  return "Web";
}

function platformFromUrl(url: string) {
  const lower = (url || "").toLowerCase();
  if (lower.includes("facebook.com") || lower.includes("fb.com")) {
    return "facebook";
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }
  return "web";
}

function displayModelName(model?: string | null) {
  if (!model) return null;
  // Folder checkpoint is best_model_task_a; show product name in UI.
  if (model === "best_model_task_a" || model.toLowerCase().includes("sombert")) {
    return "SomBERTb";
  }
  return model;
}

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    }
    if (host.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (
        parts[0] &&
        ["embed", "shorts", "live", "v"].includes(parts[0]) &&
        parts[1]
      ) {
        return parts[1];
      }
    }
  } catch {
    return "";
  }
  return "";
}

function sourceImage(item: PredictionSource) {
  if (item.image) return item.image;
  const platform = (item.platform || platformFromUrl(item.url)).toLowerCase();
  if (platform === "youtube") {
    const id = youtubeVideoId(item.url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  try {
    const host = new URL(item.url).hostname.replace(/^www\./, "");
    if (host) {
      return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function sourceProfile(item: PredictionSource) {
  if (item.profile) return item.profile;
  const platform = (item.platform || platformFromUrl(item.url)).toLowerCase();
  const title = (item.title || "").trim();
  const lower = title.toLowerCase();

  for (const marker of [
    " - facebook",
    " | facebook",
    " - youtube",
    " | youtube",
  ]) {
    if (lower.includes(marker)) {
      const name = title.slice(0, lower.indexOf(marker)).trim();
      if (name) return name;
    }
  }

  try {
    return new URL(item.url).hostname.replace(/^www\./, "") || platformLabel(platform);
  } catch {
    return platformLabel(platform);
  }
}

function displayLabel(label: string | null | undefined) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
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

function toAnalysisResult(
  response: TextPredictionResponse,
  claim: string,
  source = "Manual check",
): AnalysisResult {
  const label = displayLabel(
    response.label || (response.is_medical ? "Pending" : "Non-medical"),
  );
  return {
    claim,
    label,
    confidence: response.label_confidence,
    risk: riskFromLabel(label, response.is_medical),
    somaliReply: response.message,
    source,
    sources: response.sources ?? [],
    similarTerms:
      label === "Non-Reliable" ? (response.similar_terms ?? []) : [],
    model: response.model ?? null,
  };
}

export function PredictionWorkspace() {
  const { token } = useAuth();
  const bumpHistory = () =>
    useChatStore.setState((state) => ({
      historyRevision: state.historyRevision + 1,
    }));

  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
  const resultRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function analyzeClaim(text: string) {
    if (!token) return;
    const claim = text.trim();
    const validation = validateSomaliClaimInput(claim);
    if (!validation.ok) {
      const message = validation.message || CLAIM_INPUT_NOT_ALLOWED_MESSAGE;
      setInputError(message);
      toast.error(message);
      return;
    }
    if (claim.length > MAX_CHARS) {
      const message = `Claim must be ${MAX_CHARS} characters or fewer.`;
      setInputError(message);
      toast.error(message);
      return;
    }

    setInputError(null);
    setIsAnalyzing(true);
    try {
      const response = await predictText(token, claim);
      setResult(toAnalysisResult(response, claim));
      bumpHistory();
      toast.success("Claim analyzed.");
      scrollToResult();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to analyze this claim.";
      if (
        error instanceof ApiError &&
        message.toLowerCase().includes("not allowed")
      ) {
        setInputError(message);
      }
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function scrollToResult() {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  async function handleAnalyze() {
    await analyzeClaim(draft);
  }

  function handleClear() {
    setDraft("");
    setInputError(null);
    setResult(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function handleDraftChange(value: string) {
    const next = value.slice(0, MAX_CHARS);
    setDraft(next);
    if (!next.trim()) {
      setInputError(null);
      return;
    }
    const validation = validateSomaliClaimInput(next);
    setInputError(validation.ok ? null : validation.message || null);
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
        setInputMode("text");
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
      kind === "video" ? "Transcribing video…" : "Transcribing audio…",
    );
    try {
      const { transcribed_text } = await transcribeMedia(token, file, kind);
      const claim = (transcribed_text || "").trim();
      if (!claim) {
        toast.error(`No speech could be transcribed from that ${kind} file.`);
        return;
      }
      const clipped = claim.slice(0, MAX_CHARS);
      setDraft(clipped);
      setResult(null);
      setInputMode("text");
      toast.success(
        "Somali transcript ready. Review the text, then tap Check claim.",
      );
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : `Unable to transcribe ${kind} file.`;
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

  const charCount = draft.length;
  const showConfidence =
    result?.confidence != null &&
    result.label !== "Non-medical" &&
    result.confidence !== 0;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-14 pb-10 sm:px-8 sm:pt-10 lg:px-12">
        <div className="flex w-full max-w-none flex-col gap-8">
          <header className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight text-ink">
              Check a claim
            </h1>
            <p className="max-w-2xl text-sm text-ink-muted">
              Enter a Somali health claim to see if it is Reliable or
              Non-Reliable.
            </p>
          </header>

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

          <section className="space-y-5">
            <div
              role="tablist"
              aria-label="Input type"
              className="flex gap-5 border-b border-gray-200"
            >
              {INPUT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={inputMode === mode.id}
                  disabled={isAnalyzing}
                  onClick={() => setInputMode(mode.id)}
                  className={cn(
                    "relative -mb-px cursor-pointer pb-2.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                    inputMode === mode.id
                      ? "font-medium text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {inputMode === "text" ? (
              <div className="space-y-3">
                <label
                  htmlFor="claim-input"
                  className="text-sm font-medium text-ink"
                >
                  Claim
                </label>
                <textarea
                  ref={textareaRef}
                  id="claim-input"
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  rows={5}
                  disabled={isAnalyzing}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? "claim-input-error" : undefined}
                  placeholder="Tusaale: Tallaalka COVID-19 wuu ammaan yahay…"
                  className={cn(
                    "min-h-28 w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted/50 focus:ring-2 disabled:opacity-60",
                    inputError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-gray-200 focus:border-brand/50 focus:ring-brand/15",
                  )}
                />
                {inputError ? (
                  <p
                    id="claim-input-error"
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {inputError}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Enter a Somali health claim. Full sentences of numbers,
                    special characters, English, or Arabic are not allowed.
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs tabular-nums text-ink-muted">
                    {charCount}/{MAX_CHARS}
                  </p>
                  <div className="flex items-center gap-4">
                    {(draft || result) && (
                      <button
                        type="button"
                        disabled={isAnalyzing}
                        onClick={handleClear}
                        className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                    <GlassButton
                      type="button"
                      size="sm"
                      onClick={() => void handleAnalyze()}
                      disabled={isAnalyzing || !draft.trim() || Boolean(inputError)}
                      className="bg-brand bg-none shadow-none hover:bg-[#e65300] hover:shadow-none"
                    >
                      {isAnalyzing && !mediaBusyLabel ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : null}
                      {isAnalyzing && !mediaBusyLabel ? "Checking…" : "Check"}
                    </GlassButton>
                  </div>
                </div>
              </div>
            ) : null}

            {inputMode === "audio" ? (
              <MediaActions
                description="Upload or record audio. We transcribe to Somali — then tap Check."
                busyLabel={mediaBusyLabel}
                disabled={isAnalyzing}
                primaryLabel="Upload"
                onPrimary={() => audioInputRef.current?.click()}
                secondaryLabel="Record"
                onSecondary={() => openRecorder("audio")}
              />
            ) : null}

            {inputMode === "video" ? (
              <MediaActions
                description="Upload or record video. We transcribe to Somali — then tap Check."
                busyLabel={mediaBusyLabel}
                disabled={isAnalyzing}
                primaryLabel="Upload"
                onPrimary={() => videoInputRef.current?.click()}
                secondaryLabel="Record"
                onSecondary={() => openRecorder("video")}
              />
            ) : null}

            {inputMode === "file" ? (
              <MediaActions
                description="Upload a .txt claim or a CSV / Excel dataset."
                busyLabel={isAnalyzing ? "Processing…" : null}
                disabled={isAnalyzing}
                primaryLabel="Choose file"
                onPrimary={() => fileInputRef.current?.click()}
              />
            ) : null}
          </section>

          {isAnalyzing && !mediaBusyLabel && !result ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              Checking…
            </p>
          ) : null}

          {result ? (
            <section
              ref={resultRef}
              aria-live="polite"
              className="animate-[fade-up_0.25s_ease-out] space-y-5 border-t border-gray-200 pt-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs text-ink-muted">Result</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-medium tracking-tight",
                      result.label === "Reliable"
                        ? "text-emerald-700"
                        : result.label === "Non-Reliable"
                          ? "text-red-600"
                          : "text-ink",
                    )}
                  >
                    {result.label}
                  </p>
                </div>
                {showConfidence ? (
                  <p className="text-sm tabular-nums text-ink-muted">
                    <span className="text-ink">
                      {formatConfidence(result.confidence)}
                    </span>{" "}
                    confidence
                  </p>
                ) : null}
              </div>

              {displayModelName(result.model) ? (
                <p className="text-xs text-ink-muted">
                  Model{" "}
                  <span className="font-medium text-ink">
                    {displayModelName(result.model)}
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p className="text-ink-muted">
                  Risk{" "}
                  <span className="text-ink">{result.risk}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-ink-muted">Explanation</p>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                  {result.somaliReply}
                </p>
              </div>

              {result.label === "Non-Reliable" &&
              result.similarTerms.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-ink-muted">
                    Similar reliable words from Facebook, YouTube & Web
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.similarTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm text-ink"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(result.label === "Non-Reliable" ||
                result.label === "Reliable") &&
              result.sources.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-ink-muted">
                    {result.label === "Reliable"
                      ? "Supporting posts (image, profile, title & link)"
                      : "Reliable posts (image, profile, title & link)"}
                  </p>
                  <ul className="space-y-3">
                    {result.sources.map((item) => {
                      const platform = platformLabel(
                        item.platform || platformFromUrl(item.url),
                      );
                      const image = sourceImage(item);
                      const profile = sourceProfile(item);
                      return (
                        <li key={item.url}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-brand/40 hover:bg-orange-50/40"
                          >
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt=""
                                  className="size-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-ink-muted">
                                  {platform}
                                </span>
                                <span className="truncate text-xs font-medium text-ink">
                                  {profile}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-sm text-brand">
                                {item.title || item.url}
                              </p>
                              <p className="truncate text-[11px] text-ink-muted">
                                {item.url}
                              </p>
                            </div>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer text-sm text-brand transition-colors hover:text-brand-deep"
              >
                Check another
              </button>
            </section>
          ) : null}
        </div>
      </div>

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
    </main>
  );
}

function MediaActions({
  description,
  busyLabel,
  disabled,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  description: string;
  busyLabel: string | null;
  disabled: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="space-y-4 py-1">
      <p className="text-sm leading-6 text-ink-muted">{description}</p>
      <div className="flex flex-wrap gap-2">
        <GlassButton
          type="button"
          size="sm"
          disabled={disabled}
          onClick={onPrimary}
          className="bg-brand bg-none shadow-none hover:bg-[#e65300] hover:shadow-none"
        >
          {primaryLabel}
        </GlassButton>
        {secondaryLabel && onSecondary ? (
          <GlassButton
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onSecondary}
            className="border border-gray-200"
          >
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
