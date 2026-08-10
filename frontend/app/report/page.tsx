"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import { GlassCard } from "@/components/glass/glass-card";
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
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { downloadUserReport, getUserReport } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { UserReportResponse } from "@/types/api";

const toneStyles = {
  brand: "bg-[#ff5c00]/10 text-[#ff5c00]",
  blue: "bg-blue-500/10 text-blue-700",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
} as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

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
  value: string | number;
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
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
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
            : "Unable to load report.";
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

  const rows = report?.rows ?? [];
  const pagination = useTablePagination(rows, 10);

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

  const totalClaims = report?.total_claims ?? report?.total_rows ?? 0;
  const reliableCount = report?.reliable_count ?? 0;
  const nonReliableCount = report?.non_reliable_count ?? 0;

  return (
    <PrivatePage
      title="Report"
      description={
        isAdmin
          ? "Platform-wide preview of every prediction across all users. Download the full report as CSV."
          : "Preview of your predictions. Download the full report as CSV."
      }
      actions={
        <GlassButton
          type="button"
          disabled={isLoading || isDownloading || !totalClaims}
          onClick={() => void handleDownload()}
          className="bg-brand bg-none hover:bg-[#e65300]"
        >
          <MaterialIcon name="download" size={18} />
          {isDownloading ? "Downloading..." : "Download CSV"}
        </GlassButton>
      }
    >
      {isLoading || !report ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glass animate-pulse rounded-3xl p-5">
                <div className="h-4 w-24 rounded-full bg-gray-50" />
                <div className="mt-4 h-8 w-16 rounded-lg bg-gray-50" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total claims"
              value={totalClaims}
              icon="description"
              tone="brand"
            />
            <StatCard
              label="Users with predictions"
              value={report.users_with_predictions ?? (totalClaims ? 1 : 0)}
              icon="group"
              tone="blue"
            />
            <StatCard
              label="Reliable"
              value={reliableCount}
              icon="verified_user"
              tone="success"
            />
            <StatCard
              label="Non-Reliable"
              value={nonReliableCount}
              icon="report"
              tone="danger"
            />
          </div>

          <DataTableCard
            header={
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Prediction reports
                </h2>
                <p className="text-sm text-[#475569]">
                  {isAdmin
                    ? "Every claim checked on the platform, with the user who submitted it."
                    : "Every claim you checked, with label when available."}
                </p>
              </div>
            }
            footer={
              rows.length > 0 ? (
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
              ) : undefined
            }
          >
            <GlassTableHead>
              <GlassTableRow>
                <GlassTableHeaderCell>User</GlassTableHeaderCell>
                <GlassTableHeaderCell>Claim</GlassTableHeaderCell>
                <GlassTableHeaderCell>Label</GlassTableHeaderCell>
                <GlassTableHeaderCell>Source</GlassTableHeaderCell>
                <GlassTableHeaderCell>Date and Time</GlassTableHeaderCell>
              </GlassTableRow>
            </GlassTableHead>
            <GlassTableBody>
              {rows.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell colSpan={5}>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                        <MaterialIcon name="description" size={24} />
                      </span>
                      <p className="text-sm font-medium text-[#0f172a]">
                        No reports yet
                      </p>
                      <p className="text-sm text-[#475569]">
                        Run predictions to build a downloadable report.
                      </p>
                    </div>
                  </GlassTableCell>
                </GlassTableRow>
              ) : (
                pagination.pageItems.map((row, index) => (
                  <GlassTableRow
                    key={`${row.id ?? row.conversation_id}-${row.created_at}-${index}`}
                  >
                    <GlassTableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0f172a]">
                          {row.user_name ||
                            row.user_email?.split("@")[0] ||
                            "User"}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {row.user_email || "—"}
                        </p>
                      </div>
                    </GlassTableCell>
                    <GlassTableCell>
                      <p className="max-w-md truncate text-[#0f172a]">
                        {row.claim}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={labelTone(row.label)}>
                        {displayLabel(row.label)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {row.source || "Manual check"}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {row.created_at ? formatDateTime(row.created_at) : "—"}
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              )}
            </GlassTableBody>
          </DataTableCard>
        </div>
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
