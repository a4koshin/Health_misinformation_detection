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

const summaryCards = [
  { key: "total_rows", label: "Total rows", icon: "table_rows" },
  { key: "processed_rows", label: "Processed", icon: "task_alt" },
  { key: "reliable_count", label: "Reliable", icon: "verified" },
  { key: "misinformation_count", label: "Misinformation", icon: "report" },
] as const;

function DatasetContent() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DatasetPredictionResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file) {
      toast.error("Choose a CSV file first.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await predictDataset(token, file);
      setResult(data);
      toast.success("Dataset processed.");
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
      description="Upload a CSV with a text column to run batch predictions."
    >
      <form onSubmit={handleSubmit}>
        <GlassCard strong className="mb-6 space-y-4 p-7">
          <div className="space-y-2">
            <GlassLabel htmlFor="dataset">CSV file</GlassLabel>
            <GlassInput
              id="dataset"
              type="file"
              accept=".csv,text/csv"
              className="cursor-pointer"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-[#475569]">
              Required column: text, input_text, claim, or sentence.
            </p>
          </div>

          <GlassButton type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Processing...
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
            {summaryCards.map((card) => (
              <GlassCard key={card.key} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#475569]">{card.label}</p>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name={card.icon} size={20} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-normal tracking-tight text-[#0f172a]">
                  {result[card.key]}
                </p>
              </GlassCard>
            ))}
          </div>

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
                  <GlassTableCell className="text-[#475569]">
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
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="upload_file" size={24} />
          </span>
          <p className="text-sm font-medium text-[#0f172a]">No results yet</p>
          <p className="text-sm text-[#475569]">
            Upload a CSV dataset above to see batch predictions here.
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
