"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassInput, GlassLabel } from "@/components/glass/glass-input";
import {
  GlassTable,
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { predictDataset } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { DatasetPredictionResponse } from "@/types/api";

const ACCEPTED_EXTENSIONS =
  ".csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const summaryCards = [
  {
    key: "total_rows",
    label: "Total rows",
    icon: "table_rows",
    tone: "neutral",
  },
  {
    key: "processed_rows",
    label: "Processed",
    icon: "task_alt",
    tone: "neutral",
  },
  {
    key: "reliable_count",
    label: "Reliable",
    icon: "verified",
    tone: "success",
  },
  {
    key: "misinformation_count",
    label: "Misinformation",
    icon: "report",
    tone: "danger",
  },
] as const;

function DatasetContent() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DatasetPredictionResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file) {
      toast.error("Choose a CSV or Excel file first.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await predictDataset(token, file);
      setResult(data);
      toast.success(
        `Done — ${data.reliable_count} Reliable, ${data.misinformation_count} Misinformation.`,
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to process dataset.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PrivatePage
      title="Dataset"
      description="Upload a CSV or Excel file with a text column to run batch predictions and see Reliable vs Misinformation counts."
    >
      <form onSubmit={handleSubmit}>
        <GlassCard strong className="mb-6 space-y-4 p-7">
          <div className="space-y-2">
            <GlassLabel htmlFor="dataset">Dataset file</GlassLabel>
            <GlassInput
              id="dataset"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="cursor-pointer"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-ink-muted">
              Accepted: .csv, .xlsx, .xlsm, .xls, .xltx, .xltm. Required column:
              text, input_text, claim, sentence, or content.
            </p>
            {file ? (
              <p className="text-xs font-medium text-brand">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <GlassButton
            type="submit"
            disabled={isLoading || !file}
            className="bg-brand bg-none hover:bg-[#e65300]"
          >
            {isLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Predicting...
              </>
            ) : (
              <>
                <MaterialIcon name="play_arrow" size={18} />
                Run predictions
              </>
            )}
          </GlassButton>
        </GlassCard>
      </form>

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const value = result[card.key];
              const isReliable = card.key === "reliable_count";
              const isMisinfo = card.key === "misinformation_count";

              return (
                <GlassCard
                  key={card.key}
                  className={`p-5 ${
                    isReliable
                      ? "border-emerald-200 bg-emerald-50/50"
                      : isMisinfo
                        ? "border-red-200 bg-red-50/50"
                        : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-muted">{card.label}</p>
                    <span
                      className={`flex size-9 items-center justify-center rounded-xl ${
                        isReliable
                          ? "bg-emerald-500/10 text-emerald-700"
                          : isMisinfo
                            ? "bg-red-500/10 text-red-700"
                            : "bg-brand/10 text-brand"
                      }`}
                    >
                      <MaterialIcon name={card.icon} size={20} />
                    </span>
                  </div>
                  <p
                    className={`mt-3 text-3xl font-normal tracking-tight ${
                      isReliable
                        ? "text-emerald-700"
                        : isMisinfo
                          ? "text-red-700"
                          : "text-ink"
                    }`}
                  >
                    {value}
                  </p>
                </GlassCard>
              );
            })}
          </div>

          {result.error_count > 0 ? (
            <p className="text-sm text-ink-muted">
              {result.error_count} row
              {result.error_count === 1 ? "" : "s"} could not be classified.
            </p>
          ) : null}

          <GlassTable>
            <GlassTableHead>
              <tr>
                <GlassTableHeaderCell>Row</GlassTableHeaderCell>
                <GlassTableHeaderCell>Text</GlassTableHeaderCell>
                <GlassTableHeaderCell>Prediction</GlassTableHeaderCell>
                <GlassTableHeaderCell>Error</GlassTableHeaderCell>
              </tr>
            </GlassTableHead>
            <GlassTableBody>
              {result.results.map((row) => (
                <GlassTableRow key={`${row.row}-${row.text}`}>
                  <GlassTableCell className="text-ink-muted">
                    {row.row}
                  </GlassTableCell>
                  <GlassTableCell className="max-w-md truncate">
                    {row.text || "—"}
                  </GlassTableCell>
                  <GlassTableCell>
                    {row.prediction ? (
                      <GlassBadge
                        tone={
                          row.prediction === "Reliable" ? "success" : "danger"
                        }
                      >
                        {row.prediction}
                      </GlassBadge>
                    ) : (
                      "—"
                    )}
                  </GlassTableCell>
                  <GlassTableCell className="text-red-600">
                    {row.error || "—"}
                  </GlassTableCell>
                </GlassTableRow>
              ))}
            </GlassTableBody>
          </GlassTable>
        </div>
      ) : (
        <GlassCard className="flex flex-col items-center gap-2 p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <MaterialIcon name="upload_file" size={24} />
          </span>
          <p className="text-sm font-medium text-ink">No results yet</p>
          <p className="text-sm text-ink-muted">
            Upload a CSV or Excel dataset above to see Reliable and
            Misinformation counts.
          </p>
        </GlassCard>
      )}
    </PrivatePage>
  );
}

export default function DatasetPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <DatasetContent />
      </AppShell>
    </ProtectedRoute>
  );
}
