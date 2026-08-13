"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { GlassButton } from "@/components/glass/glass-button";
import { predictDataset } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import type {
  DatasetPredictionResponse,
  DatasetPredictionRow,
} from "@/types/api";
import {
  CLAIM_INPUT_NOT_ALLOWED_MESSAGE,
  validateSomaliClaimInput,
} from "@/lib/claim-validation";
import {
  enrichPrediction,
  predictText,
  transcribeMediaUrl,
  type PredictionSource,
  type TextPredictionResponse,
} from "@/lib/predict";
import { validateSocialMediaUrl } from "@/lib/social-media-url";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const FILE_ACCEPT =
  ".txt,.csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const INPUT_MODES = [
  { id: "text" as const, label: "Text" },
  { id: "link" as const, label: "Link", disabled: true },
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
  // Folder checkpoint is sombertb_task_a; show product name in UI.
  if (
    model === "sombertb_task_a" ||
    model === "sombertb_Model" ||
    model === "somBERTb_Model" ||
    model === "SomBERTb_Model" ||
    model === "best_model_task_a" ||
    model === "SomBERTb" ||
    model.toLowerCase().includes("sombert")
  ) {
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
    return (
      new URL(item.url).hostname.replace(/^www\./, "") ||
      platformLabel(platform)
    );
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
  const [isEnriching, setIsEnriching] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [datasetResult, setDatasetResult] =
    useState<DatasetPredictionResponse | null>(null);
  const [datasetEmptyMessage, setDatasetEmptyMessage] = useState<string | null>(
    null,
  );
  const [mediaBusyLabel, setMediaBusyLabel] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaUrlError, setMediaUrlError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "link" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisSeq = useRef(0);
  const analyzeLock = useRef(false);

  async function analyzeClaim(text: string) {
    if (!token || analyzeLock.current) return;
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
    const seq = ++analysisSeq.current;
    analyzeLock.current = true;
    setIsAnalyzing(true);
    setIsEnriching(false);

    let response: TextPredictionResponse | null = null;
    try {
      response = await predictText(token, claim);
      if (seq !== analysisSeq.current) return;
      setDatasetResult(null);
      setResult(toAnalysisResult(response, claim));
      bumpHistory();
      toast.success(
        response.is_medical ? "SomBERTb result ready." : "Not a medical claim.",
      );
      scrollToResult();
    } catch (error) {
      if (seq !== analysisSeq.current) return;
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
      return;
    } finally {
      if (seq === analysisSeq.current) {
        setIsAnalyzing(false);
        analyzeLock.current = false;
      }
    }

    if (
      seq !== analysisSeq.current ||
      !response?.is_medical ||
      !response.enrichment_pending ||
      !response.prediction_id
    ) {
      return;
    }

    setIsEnriching(true);
    try {
      const enriched = await enrichPrediction(token, response.prediction_id);
      if (seq !== analysisSeq.current) return;
      setResult((current) => {
        if (!current) return current;
        const nextLabel = current.label;
        return {
          ...current,
          somaliReply: enriched.message || current.somaliReply,
          sources: enriched.sources ?? current.sources,
          similarTerms:
            nextLabel === "Non-Reliable"
              ? (enriched.similar_terms ?? current.similarTerms)
              : [],
        };
      });
    } catch {
      if (seq === analysisSeq.current) {
        toast.error("SomBERTb result is ready. Explanation sources timed out.");
      }
    } finally {
      if (seq === analysisSeq.current) {
        setIsEnriching(false);
      }
    }
  }

  function scrollToResult() {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);
  }

  async function handleAnalyze() {
    await analyzeClaim(draft);
  }

  function handleClearResult() {
    analysisSeq.current += 1;
    analyzeLock.current = false;
    setIsAnalyzing(false);
    setIsEnriching(false);
    setResult(null);
    setDatasetResult(null);
    setDatasetEmptyMessage(null);
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
      setResult(null);
      setDatasetResult(null);
      setDatasetEmptyMessage(null);
      if (file.size === 0) {
        const message =
          "The uploaded file is empty. Add claim text and try again.";
        setDatasetEmptyMessage(message);
        toast.error(message);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setIsAnalyzing(true);
      try {
        const dataset = await predictDataset(token, file);
        if (!dataset.processed_rows) {
          const message =
            "The uploaded file is empty. Add claim text and try again.";
          setDatasetEmptyMessage(message);
          toast.error(message);
          return;
        }
        setDatasetResult(dataset);
        bumpHistory();
        toast.success(
          `Dataset done — ${dataset.reliable_count} Reliable, ${dataset.misinformation_count} Non-Reliable.`,
        );
        scrollToResult();
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to process dataset.";
        setDatasetEmptyMessage(
          message.toLowerCase().includes("empty") ? message : null,
        );
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

  function handleMediaUrlChange(value: string) {
    setMediaUrl(value);
    if (!value.trim()) {
      setMediaUrlError(null);
      return;
    }
    const validation = validateSocialMediaUrl(value);
    setMediaUrlError(validation.ok ? null : validation.message || null);
  }

  async function handleMediaUrl() {
    if (!token || analyzeLock.current || isAnalyzing) return;
    const url = mediaUrl.trim();
    const validation = validateSocialMediaUrl(url);
    if (!validation.ok) {
      const message = validation.message || "This social link is not allowed.";
      setMediaUrlError(message);
      toast.error(message);
      return;
    }

    setMediaUrlError(null);
    analyzeLock.current = true;
    setIsAnalyzing(true);
    setMediaBusyLabel("Downloading and transcribing…");

    let transcript = "";
    try {
      const { transcribed_text } = await transcribeMediaUrl(
        token,
        url,
        "video",
      );
      transcript = (transcribed_text || "").trim();
      if (!transcript) {
        toast.error("No speech could be transcribed from that link.");
        return;
      }
      const clipped = transcript.slice(0, MAX_CHARS);
      setDraft(clipped);
      setResult(null);
      setInputMode("text");
      toast.success("Transcript ready. Running SomBERTb…");
      transcript = clipped;
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to download or transcribe that link.";
      setMediaUrlError(
        message.toLowerCase().includes("link") ||
          message.toLowerCase().includes("facebook") ||
          message.toLowerCase().includes("youtube")
          ? message
          : null,
      );
      toast.error(message);
      transcript = "";
    } finally {
      analyzeLock.current = false;
      setIsAnalyzing(false);
      setMediaBusyLabel(null);
    }

    if (transcript) {
      await analyzeClaim(transcript);
    }
  }

  const charCount = draft.length;
  const showConfidence =
    result?.confidence != null &&
    result.label !== "Non-medical" &&
    result.confidence !== 0;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-10 sm:px-8 sm:pt-6 lg:px-12">
        <div className="flex w-full max-w-none flex-col gap-8">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
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
                  aria-disabled={mode.disabled}
                  disabled={isAnalyzing || mode.disabled}
                  title={mode.disabled ? "Link checks are disabled." : undefined}
                  onClick={() => {
                    if (mode.disabled) return;
                    setInputMode(mode.id);
                  }}
                  className={cn(
                    "relative -mb-px cursor-pointer pb-2.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                    mode.disabled && "opacity-40 hover:text-ink-muted",
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
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={
                    inputError ? "claim-input-error" : undefined
                  }
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
                    {(result || datasetResult) && (
                      <button
                        type="button"
                        onClick={handleClearResult}
                        className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        Clear result
                      </button>
                    )}
                    <GlassButton
                      type="button"
                      size="sm"
                      onClick={() => void handleAnalyze()}
                      disabled={
                        isAnalyzing || !draft.trim() || Boolean(inputError)
                      }
                      className="bg-brand bg-none shadow-none hover:bg-[#e65300] hover:shadow-none"
                    >
                      {isAnalyzing && !mediaBusyLabel ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : null}
                      {isAnalyzing && !mediaBusyLabel
                        ? "Predicting...."
                        : "Predict"}
                    </GlassButton>
                  </div>
                </div>
              </div>
            ) : null}

            {inputMode === "link" ? (
              <SocialLinkField
                value={mediaUrl}
                error={mediaUrlError}
                disabled={isAnalyzing}
                checking={mediaBusyLabel === "Downloading and transcribing…"}
                onChange={handleMediaUrlChange}
                onSubmit={() => void handleMediaUrl()}
              />
            ) : null}

            {inputMode === "file" ? (
              <MediaActions
                description="Upload a .txt claim or a CSV / Excel dataset."
                busyLabel={null}
                disabled={isAnalyzing}
                primaryLabel="Choose file"
                onPrimary={() => fileInputRef.current?.click()}
              />
            ) : null}
          </section>

          {isAnalyzing && inputMode === "file" && !datasetResult ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              Processing dataset…
            </p>
          ) : null}

          {datasetEmptyMessage ? (
            <p role="alert" className="text-sm text-red-600">
              {datasetEmptyMessage}
            </p>
          ) : null}

          {datasetResult ? (
            <section
              ref={resultRef}
              aria-live="polite"
              className="animate-[fade-up_0.25s_ease-out] space-y-4 border-t border-gray-200 pt-8"
            >
              <div>
                <p className="text-xs text-ink-muted">Dataset result</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {datasetResult.processed_rows}/{datasetResult.total_rows}{" "}
                  processed
                </p>
                <p className="mt-1 text-xs text-ink-muted">Model SomBERTb</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  {datasetResult.reliable_count} Reliable
                </span>
                <span className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
                  {datasetResult.misinformation_count} Non-Reliable
                </span>
                {datasetResult.error_count > 0 ? (
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-ink-muted">
                    {datasetResult.error_count} errors
                  </span>
                ) : null}
              </div>
              <DatasetResultsTable
                results={datasetResult.results}
                showErrors={datasetResult.error_count > 0}
              />
              <button
                type="button"
                onClick={handleClearResult}
                className="cursor-pointer text-sm text-brand transition-colors hover:text-brand-deep"
              >
                Predict another
              </button>
            </section>
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
                      "mt-1 text-2xl font-semibold tracking-tight",
                      result.label === "Reliable"
                        ? "text-emerald-700"
                        : result.label === "Non-Reliable"
                          ? "text-red-600"
                          : "text-ink",
                    )}
                  >
                    {result.label}
                  </p>
                  {result.label === "Non-Reliable" ? (
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
                      This claim is waiting for an admin to assign a doctor for review.
                      Open History to see when they correct it.
                    </p>
                  ) : null}
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
                  Risk <span className="text-ink">{result.risk}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-ink-muted">Explanation</p>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                  {result.somaliReply}
                </p>
                {isEnriching ? (
                  <p className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
                    <span className="size-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                    Loading Cerebras / Groq explanation and sources…
                  </p>
                ) : null}
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
                onClick={handleClearResult}
                className="cursor-pointer text-sm text-brand transition-colors hover:text-brand-deep"
              >
                Predict another
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function DatasetResultsTable({
  results,
  showErrors,
}: {
  results: DatasetPredictionRow[];
  showErrors: boolean;
}) {
  const pagination = useTablePagination(results, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="w-14 px-3 py-2.5 text-xs font-semibold text-ink-muted">
              #
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-ink-muted">
              Claim
            </th>
            <th className="w-40 px-3 py-2.5 text-xs font-semibold text-ink-muted">
              Result
            </th>
            {showErrors ? (
              <th className="w-44 px-3 py-2.5 text-xs font-semibold text-ink-muted">
                Error
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {pagination.pageItems.map((row) => (
            <tr
              key={`${row.row}-${row.text.slice(0, 24)}`}
              className="border-b border-gray-100 last:border-b-0"
            >
              <td className="px-3 py-2.5 align-top tabular-nums text-ink-muted">
                {row.row}
              </td>
              <td className="max-w-xl px-3 py-2.5 align-top text-ink">
                {row.text || "—"}
              </td>
              <td className="px-3 py-2.5 align-top">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                    row.prediction === "Reliable"
                      ? "bg-emerald-50 text-emerald-700"
                      : row.prediction
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-ink-muted",
                  )}
                >
                  {row.prediction ?? "Skipped"}
                </span>
              </td>
              {showErrors ? (
                <td className="px-3 py-2.5 align-top text-sm text-red-600">
                  {row.error || "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        pageNumbers={pagination.pageNumbers}
        onPageChange={pagination.setPage}
        rowsPerPage={pagination.rowsPerPage}
        onRowsPerPageChange={pagination.setRowsPerPage}
      />
    </div>
  );
}

function SocialLinkField({
  value,
  error,
  disabled,
  checking,
  onChange,
  onSubmit,
}: {
  value: string;
  error: string | null;
  disabled: boolean;
  checking: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="media-link-input"
        className="text-sm font-medium text-ink"
      >
        Video link
      </label>
      <input
        id="media-link-input"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        placeholder="https://www.youtube.com/watch?v=… or Facebook / TikTok link"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "media-link-error" : "media-link-help"}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (!disabled && value.trim()) onSubmit();
          }
        }}
        className={cn(
          "min-h-11 w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted/50 focus:ring-2 disabled:opacity-60",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
            : "border-gray-200 focus:border-brand/50 focus:ring-brand/15",
        )}
      />
      {error ? (
        <p id="media-link-error" role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        <p id="media-link-help" className="text-xs text-ink-muted">
          Paste a Facebook, YouTube, TikTok, Instagram, or X link. We transcribe
          Somali speech (up to 15 minutes), then SomBERTb predicts.
        </p>
      )}
      <GlassButton
        type="button"
        size="sm"
        disabled={disabled || !value.trim() || Boolean(error)}
        onClick={onSubmit}
        className="bg-brand bg-none shadow-none hover:bg-[#e65300] hover:shadow-none"
      >
        {checking ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : null}
        {checking ? "Working…" : "Check link"}
      </GlassButton>
    </div>
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
