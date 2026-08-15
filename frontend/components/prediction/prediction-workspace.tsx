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
  type PredictionSource,
  type TextPredictionResponse,
} from "@/lib/predict";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const FILE_ACCEPT =
  ".txt,.csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const INPUT_MODES = [
  { id: "text" as const, label: "Text" },
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
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
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

  const charCount = draft.length;
  const showConfidence =
    result?.confidence != null &&
    result.label !== "Non-medical" &&
    result.confidence !== 0;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-6 pb-12 sm:px-8 lg:px-12">
        <div className="flex w-full flex-col gap-7">
          <header className="space-y-1.5">
            <h1 className="text-[1.65rem] font-semibold tracking-tight text-ink">
              Prediction
            </h1>
            <p className="text-sm leading-relaxed text-ink-muted">
              Check a Somali health claim with SomBERTb.
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

          <section className="space-y-4">
            <div
              role="tablist"
              aria-label="Input type"
              className="inline-flex rounded-full bg-gray-100 p-1"
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
                    "cursor-pointer rounded-full px-4 py-1.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                    inputMode === mode.id
                      ? "bg-white font-medium text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {inputMode === "text" ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-[border-color,box-shadow] duration-200 focus-within:border-brand/40 focus-within:shadow-[0_0_0_3px_rgba(255,92,0,0.08)]">
                <label htmlFor="claim-input" className="sr-only">
                  Claim
                </label>
                <textarea
                  ref={textareaRef}
                  id="claim-input"
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  rows={6}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={
                    inputError ? "claim-input-error" : "claim-input-hint"
                  }
                  placeholder="Tusaale: Tallaalka COVID-19 wuu ammaan yahay…"
                  className="min-h-36 w-full resize-y border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-muted/45 disabled:opacity-60"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-3 py-2.5">
                  <p
                    id={inputError ? "claim-input-error" : "claim-input-hint"}
                    className={cn(
                      "min-w-0 flex-1 text-xs",
                      inputError ? "text-red-600" : "text-ink-muted",
                    )}
                    role={inputError ? "alert" : undefined}
                  >
                    {inputError
                      ? inputError
                      : `${charCount}/${MAX_CHARS} · Somali health claims only`}
                  </p>
                  <div className="flex items-center gap-3">
                    {(result || datasetResult) && (
                      <button
                        type="button"
                        onClick={handleClearResult}
                        className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        Clear
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
                      {isAnalyzing ? (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : null}
                      {isAnalyzing ? "Predicting…" : "Predict"}
                    </GlassButton>
                  </div>
                </div>
              </div>
            ) : null}

            {inputMode === "file" ? (
              <MediaActions
                description="Upload a .txt claim or a CSV / Excel dataset."
                busyLabel={
                  isAnalyzing && !datasetResult ? "Processing dataset…" : null
                }
                disabled={isAnalyzing}
                primaryLabel="Choose file"
                onPrimary={() => fileInputRef.current?.click()}
              />
            ) : null}
          </section>

          {datasetEmptyMessage ? (
            <p role="alert" className="text-sm text-red-600">
              {datasetEmptyMessage}
            </p>
          ) : null}

          {datasetResult ? (
            <section
              ref={resultRef}
              aria-live="polite"
              className="animate-[fade-up_0.25s_ease-out] space-y-5 border-t border-gray-100 pt-7"
            >
              <div className="space-y-1">
                <p className="text-xs tracking-wide text-ink-muted uppercase">
                  Dataset
                </p>
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {datasetResult.processed_rows}
                  <span className="font-normal text-ink-muted">
                    /{datasetResult.total_rows}
                  </span>{" "}
                  processed
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-emerald-700">
                  {datasetResult.reliable_count} Reliable
                </span>
                <span className="text-ink-muted">·</span>
                <span className="text-red-600">
                  {datasetResult.misinformation_count} Non-Reliable
                </span>
                {datasetResult.error_count > 0 ? (
                  <>
                    <span className="text-ink-muted">·</span>
                    <span className="text-ink-muted">
                      {datasetResult.error_count} errors
                    </span>
                  </>
                ) : null}
              </div>
              <DatasetResultsTable
                results={datasetResult.results}
                showErrors={datasetResult.error_count > 0}
              />
              <button
                type="button"
                onClick={handleClearResult}
                className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-brand"
              >
                Predict another
              </button>
            </section>
          ) : null}

          {result ? (
            <section
              ref={resultRef}
              aria-live="polite"
              className="animate-[fade-up_0.25s_ease-out] space-y-6 border-t border-gray-100 pt-7"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-wide text-ink-muted uppercase">
                      Result
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-3xl font-semibold tracking-tight",
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
                      {formatConfidence(result.confidence)}
                    </p>
                  ) : null}
                </div>

                {(() => {
                  const modelName = displayModelName(result.model);
                  const meta = [
                    modelName,
                    result.risk !== "—" && result.risk !== "None"
                      ? `Risk ${result.risk}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return meta ? (
                    <p className="text-sm text-ink-muted">{meta}</p>
                  ) : null;
                })()}

                {result.label === "Non-Reliable" ? (
                  <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
                    Waiting for an admin to assign a doctor. Check History for
                    the rewrite.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs tracking-wide text-ink-muted uppercase">
                  Explanation
                </p>
                <p className="text-[15px] leading-7 whitespace-pre-wrap text-ink">
                  {result.somaliReply}
                </p>
                {isEnriching ? (
                  <p className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
                    <span className="size-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                    Loading explanation…
                  </p>
                ) : null}
              </div>

              {result.label === "Non-Reliable" &&
              result.similarTerms.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs tracking-wide text-ink-muted uppercase">
                    Related terms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.similarTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-gray-50 px-3 py-1 text-sm text-ink"
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
                  <p className="text-xs tracking-wide text-ink-muted uppercase">
                    Sources
                  </p>
                  <ul className="divide-y divide-gray-100 border-t border-b border-gray-100">
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
                            className="flex gap-3 py-3 transition-colors hover:bg-gray-50/80"
                          >
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
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
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="truncate text-xs text-ink-muted">
                                {platform}
                                {profile ? ` · ${profile}` : ""}
                              </p>
                              <p className="line-clamp-2 text-sm text-ink">
                                {item.title || item.url}
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
                className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-brand"
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
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/80">
          <tr>
            <th className="w-14 px-3 py-2.5 text-xs font-medium text-ink-muted">
              #
            </th>
            <th className="px-3 py-2.5 text-xs font-medium text-ink-muted">
              Claim
            </th>
            <th className="w-40 px-3 py-2.5 text-xs font-medium text-ink-muted">
              Result
            </th>
            {showErrors ? (
              <th className="w-44 px-3 py-2.5 text-xs font-medium text-ink-muted">
                Error
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {pagination.pageItems.map((row) => (
            <tr
              key={`${row.row}-${row.text.slice(0, 24)}`}
              className="border-b border-gray-50 last:border-b-0"
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

function MediaActions({
  description,
  busyLabel,
  disabled,
  primaryLabel,
  onPrimary,
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
    <button
      type="button"
      disabled={disabled}
      onClick={onPrimary}
      className={cn(
        "group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-[#fafafa] px-6 py-10 text-center transition-[border-color,background-color] duration-200",
        "hover:border-brand/45 hover:bg-[#ffefe6]/35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm ring-1 ring-black/4 transition-transform duration-200 group-hover:scale-[1.03]">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-medium text-ink">{primaryLabel}</span>
        <span className="block text-xs text-ink-muted">{description}</span>
      </span>
      {busyLabel ? (
        <span className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          {busyLabel}
        </span>
      ) : null}
    </button>
  );
}
