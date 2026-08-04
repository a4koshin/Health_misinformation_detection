"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { predictText, type TextPredictionResponse } from "@/lib/predict";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const FILE_ACCEPT =
  ".txt,.csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
  response: TextPredictionResponse,
  claim: string,
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
    source: "Manual check",
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      title="Prediction"
      description="Analyze Somali health claims and review your recent saved results."
      className="w-full max-w-none gap-4 sm:gap-5"
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

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-4">
        {/* Analyze card */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-medium text-ink">Analyze a claim</h2>
            <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
              Enter text below, or upload a .txt / .csv / .xlsx file.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <label
                htmlFor="claim-input"
                className="text-xs font-medium text-ink sm:text-sm"
              >
                Health claim
              </label>
              <div className="relative">
                <textarea
                  id="claim-input"
                  value={draft}
                  onChange={(event) =>
                    setDraft(event.target.value.slice(0, MAX_CHARS))
                  }
                  rows={5}
                  disabled={isAnalyzing}
                  placeholder="Paste a Somali health claim here…"
                  className="min-h-[120px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-5 text-ink outline-none transition-shadow placeholder:text-ink-muted/70 focus:border-brand/40 focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
                />
                <p className="pointer-events-none absolute right-2.5 bottom-2.5 text-[10px] tabular-nums text-ink-muted">
                  {charCount}/{MAX_CHARS}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-0.5">
              <GlassButton
                type="button"
                size="sm"
                onClick={() => void handleAnalyze()}
                disabled={isAnalyzing || !draft.trim()}
                className="bg-brand bg-none hover:bg-[#e65300]"
              >
                {isAnalyzing ? (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <MaterialIcon name="autorenew" size={16} />
                )}
                Analyze claim
              </GlassButton>

              <GlassButton
                type="button"
                size="sm"
                variant="outline"
                disabled={isAnalyzing}
                onClick={() => fileInputRef.current?.click()}
              >
                <MaterialIcon name="upload" size={16} />
                Upload file
              </GlassButton>

              <GlassButton
                type="button"
                size="sm"
                variant="ghost"
                disabled={isAnalyzing || (!draft && !result)}
                onClick={handleClear}
              >
                Clear
              </GlassButton>
            </div>
          </div>
        </section>

        {/* Result card */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-medium text-ink">Result</h2>
            <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
              Label, topic, and confidence appear here after analysis.
            </p>
          </div>

          <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
            {!result ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <MaterialIcon name="analytics" size={20} />
                </span>
                <p className="text-sm font-medium text-ink">No result yet</p>
                <p className="max-w-xs text-xs text-ink-muted sm:text-sm">
                  Analyze a claim to see the label, topic, confidence, and Somali
                  reply.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile label="Label">
                    <GlassBadge tone={labelTone(result.label)} className="px-2.5 py-0.5">
                      {result.label}
                    </GlassBadge>
                  </MetricTile>
                  <MetricTile label="Topic">
                    <p className="text-sm font-medium text-ink">
                      {result.topic || "—"}
                    </p>
                  </MetricTile>
                  <MetricTile label="Confidence">
                    <p className="text-sm font-semibold tabular-nums text-ink">
                      {formatConfidence(result.confidence)}
                    </p>
                  </MetricTile>
                  <MetricTile label="Risk">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        result.risk === "High"
                          ? "text-red-700"
                          : result.risk === "Low"
                            ? "text-emerald-700"
                            : "text-ink",
                      )}
                    >
                      {result.risk}
                    </p>
                  </MetricTile>
                </div>

                <DetailBlock label="Claim">{result.claim}</DetailBlock>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                    Somali reply
                  </p>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-5 text-ink whitespace-pre-wrap">
                    {result.somaliReply}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Previous predictions */}
      <DataTableCard
        className="min-w-0 rounded-2xl [&_>div:first-child]:px-4 [&_>div:first-child]:py-3.5 sm:[&_>div:first-child]:px-5"
        tableClassName="table-fixed w-full text-[13px]"
        header={
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-ink">
                Previous predictions
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                Your recent saved results from this account.
              </p>
            </div>
            <div className="w-full max-w-[120px] space-y-1 sm:shrink-0">
              <GlassLabel htmlFor="prediction-rows">Rows per page</GlassLabel>
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
                    No predictions yet
                  </p>
                  <p className="text-sm text-ink-muted">
                    Analyze a claim to see it listed here.
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
    </PrivatePage>
  );
}

function MetricTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
        {label}
      </p>
      <p className="text-sm leading-5 text-ink">{children}</p>
    </div>
  );
}
