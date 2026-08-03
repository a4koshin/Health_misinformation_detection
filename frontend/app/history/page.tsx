"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { DataTableCard } from "@/components/glass/data-table-card";
import { DeleteAlertModal } from "@/components/glass/delete-alert-modal";
import {
  GlassInput,
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
import { TableDeleteButton } from "@/components/glass/table-icon-button";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { deleteConversation, getHistory } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

type LabelFilter = "all" | "Reliable" | "Non-Reliable";

function formatPredictionId(id: string) {
  const numeric = Number(id);
  if (Number.isFinite(numeric)) {
    return `PR-${String(numeric).padStart(4, "0")}`;
  }
  return `PR-${id}`;
}

function displayLabel(label: string | null) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
}

function labelTone(label: string | null) {
  const value = displayLabel(label);
  if (value === "Reliable") return "success" as const;
  if (value === "Non-Reliable") return "danger" as const;
  return "neutral" as const;
}

function formatConfidence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
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

function HistoryContent() {
  const { token } = useAuth();
  const historyRevision = useChatStore((state) => state.historyRevision);
  const removeChat = useChatStore((state) => state.removeChat);

  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<Detection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) {
        if (active) {
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const items = await getHistory(token);
        if (active) setHistory(Array.isArray(items) ? items : []);
      } catch {
        if (active) {
          setHistory([]);
          toast.error("Unable to load history.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((item) => {
      const label = displayLabel(item.label);
      if (labelFilter !== "all" && label !== labelFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        formatPredictionId(item.id),
        item.id,
        claimText(item),
        item.source ?? "",
        label,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [history, search, labelFilter]);

  const pagination = useTablePagination(filtered, 10);

  async function handleDelete() {
    if (!token || !pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteConversation(token, pendingDelete.id);
      setHistory((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      removeChat(pendingDelete.id);
      setPendingDelete(null);
      toast.success("Prediction deleted.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to delete prediction.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PrivatePage
      title="Prediction History"
      description="Your saved detections. Search, filter, and page through records."
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-medium text-[#0f172a]">
              Predictions
            </h2>
            <p className="text-sm text-[#475569]">
              Search, filter, and page through your detection records.
            </p>
          </div>
        }
        toolbar={
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <GlassLabel htmlFor="history-search">Search</GlassLabel>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
                />
                <GlassInput
                  id="history-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search claim, ID, or source..."
                  className="rounded-xl bg-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <GlassLabel htmlFor="history-label">Label</GlassLabel>
              <GlassSelect
                id="history-label"
                value={labelFilter}
                onChange={(event) =>
                  setLabelFilter(event.target.value as LabelFilter)
                }
                className="rounded-xl bg-white"
              >
                <option value="all">All labels</option>
                <option value="Reliable">Reliable</option>
                <option value="Non-Reliable">Non-Reliable</option>
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
            rowsPerPage={pagination.rowsPerPage}
            onRowsPerPageChange={pagination.setRowsPerPage}
          />
        }
      >
        <GlassTableHead>
          <GlassTableRow>
            <GlassTableHeaderCell>Claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>Label</GlassTableHeaderCell>
            <GlassTableHeaderCell>Confidence</GlassTableHeaderCell>
            <GlassTableHeaderCell>Source</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Action
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <GlassTableRow key={index}>
                    <GlassTableCell colSpan={6}>
                      <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell colSpan={6}>
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <MaterialIcon
                        name="history"
                        size={28}
                        className="text-[#ff8a4d]"
                      />
                      <p className="text-sm font-medium text-[#0f172a]">
                        No predictions found
                      </p>
                      <p className="text-sm text-[#475569]">
                        Try a different search or label filter.
                      </p>
                    </div>
                  </GlassTableCell>
                </GlassTableRow>
              ) : (
                pagination.pageItems.map((item) => (
                  <GlassTableRow key={item.id}>
                    <GlassTableCell className="max-w-[320px]">
                      <p className="line-clamp-2 font-medium text-[#0f172a]">
                        {claimText(item)}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={labelTone(item.label)}>
                        {displayLabel(item.label)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {formatConfidence(
                        item.label_confidence ?? item.confidence,
                      )}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {item.source || "Manual check"}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {formatDate(item.created_at)}
                    </GlassTableCell>
                    <GlassTableCell className="text-right">
                      <TableDeleteButton
                        onClick={() => setPendingDelete(item)}
                        disabled={isDeleting && pendingDelete?.id === item.id}
                        label={`Delete prediction ${item.id}`}
                      />
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              )}
            </GlassTableBody>
      </DataTableCard>

      <DeleteAlertModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
        itemLabel={
          pendingDelete
            ? formatPredictionId(pendingDelete.id)
            : undefined
        }
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PrivatePage>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <HistoryContent />
      </AppShell>
    </ProtectedRoute>
  );
}
