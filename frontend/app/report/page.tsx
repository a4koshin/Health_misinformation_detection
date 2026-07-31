"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
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
import { ApiError } from "@/lib/api";
import { formatRelativeTime } from "@/lib/chat";
import { downloadUserReport, getUserReport } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { UserReportResponse } from "@/types/api";

const summaryCards = [
  {
    key: "total_rows",
    label: "Total reports",
    icon: "description",
    tone: "brand",
  },
  {
    key: "reliable_count",
    label: "Reliable",
    icon: "verified",
    tone: "success",
  },
  {
    key: "non_reliable_count",
    label: "Non-Reliable",
    icon: "report",
    tone: "danger",
  },
] as const;

const toneStyles = {
  brand: "bg-[#ff5c00]/10 text-[#ff5c00]",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
} as const;

function labelTone(label: string | null) {
  if (label === "Reliable") return "success" as const;
  if (label === "Non-Reliable" || label === "Misinformation") {
    return "danger" as const;
  }
  return "neutral" as const;
}

function displayLabel(label: string | null) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: keyof typeof toneStyles;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#475569]">{label}</p>
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}
        >
          <MaterialIcon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-normal tracking-tight text-[#0f172a]">
        {value}
      </p>
    </GlassCard>
  );
}

function ReportContent() {
  const { token } = useAuth();
  const historyRevision = useChatStore((state) => state.historyRevision);
  const [report, setReport] = useState<UserReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await getUserReport(token);
        if (active) setReport(data);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load your report.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  async function handleDownload() {
    if (!token) return;
    setIsDownloading(true);
    try {
      await downloadUserReport(token);
      toast.success("Report downloaded.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to download report.";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <PrivatePage
      title="Report"
      description="Preview every prediction you made and download the full report as CSV."
      actions={
        <GlassButton
          type="button"
          disabled={isLoading || isDownloading || !report?.total_rows}
          onClick={() => void handleDownload()}
          className="bg-brand bg-none hover:bg-[#e65300]"
        >
          <MaterialIcon name="download" size={18} />
          {isDownloading ? "Downloading..." : "Download CSV"}
        </GlassButton>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="glass animate-pulse rounded-3xl p-5">
              <div className="h-4 w-24 rounded-full bg-gray-50" />
              <div className="mt-4 h-8 w-16 rounded-lg bg-gray-50" />
            </div>
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={report[card.key]}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3">
              <h2 className="text-base font-normal text-[#0f172a]">
                Prediction reports
              </h2>
              <p className="text-xs text-[#475569]">
                Every claim you checked, with label and topic when available
              </p>
            </div>

            {report.rows.length === 0 ? (
              <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                  <MaterialIcon name="description" size={24} />
                </span>
                <p className="text-sm font-medium text-[#0f172a]">
                  No reports yet
                </p>
                <p className="text-sm text-[#475569]">
                  Run predictions to build a downloadable report.
                </p>
              </GlassCard>
            ) : (
              <GlassTable>
                <GlassTableHead>
                  <GlassTableRow>
                    <GlassTableHeaderCell>Claim</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Label</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Topic</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Date</GlassTableHeaderCell>
                  </GlassTableRow>
                </GlassTableHead>
                <GlassTableBody>
                  {report.rows.map((row, index) => (
                    <GlassTableRow
                      key={`${row.conversation_id}-${row.created_at}-${index}`}
                    >
                      <GlassTableCell>
                        <p className="max-w-md truncate font-medium text-[#0f172a]">
                          {row.claim}
                        </p>
                      </GlassTableCell>
                      <GlassTableCell>
                        <GlassBadge tone={labelTone(row.label)}>
                          {displayLabel(row.label)}
                        </GlassBadge>
                      </GlassTableCell>
                      <GlassTableCell className="text-[#475569]">
                        {row.topic ?? "—"}
                      </GlassTableCell>
                      <GlassTableCell className="text-[#475569]">
                        {formatRelativeTime(row.created_at)}
                      </GlassTableCell>
                    </GlassTableRow>
                  ))}
                </GlassTableBody>
              </GlassTable>
            )}
          </div>
        </>
      ) : (
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="description" size={24} />
          </span>
          <p className="text-sm text-[#475569]">No report data available.</p>
        </GlassCard>
      )}
    </PrivatePage>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute roles={["user", "admin"]}>
      <AppShell>
        <ReportContent />
      </AppShell>
    </ProtectedRoute>
  );
}
