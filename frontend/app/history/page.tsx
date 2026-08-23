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
import { TableIconButton } from "@/components/glass/table-icon-button";
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { getHistory, setPredictionActive } from "@/lib/history";
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

function reviewTone(status: Detection["review_status"]) {
  if (status === "confirmed") return "success" as const;
  if (status === "corrected") return "info" as const;
  if (status === "pending" || status === "awaiting_assignment") return "brand" as const;
  return "neutral" as const;
}

function reviewLabel(item: Detection) {
  if (item.review_status === "awaiting_assignment") return "Awaiting assignment";
  if (item.review_status === "pending") return "Assigned";
  if (item.review_status === "confirmed") return "Confirmed";
  if (item.review_status === "corrected") return "Corrected";
  if (item.needs_review) return "Awaiting assignment";
  return null;
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

function correctedText(item: Detection) {
  return (item.corrected_claim_text || "").trim() || null;
}

function HistoryContent() {
  const { user, token } = useAuth();
  const isAdvisor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";
  const historyRevision = useChatStore((state) => state.historyRevision);
  const columnCount = isAdvisor ? 8 : isAdmin ? 10 : 8;

  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [pendingDeactivate, setPendingDeactivate] = useState<Detection | null>(
    null,
  );
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [detailItem, setDetailItem] = useState<Detection | null>(null);

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
        item.original_claim_text ?? "",
        item.corrected_claim_text ?? "",
        item.user_name ?? "",
        item.user_email ?? "",
        item.advisor_name ?? "",
        item.source ?? "",
        label,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [history, search, labelFilter]);

  const pagination = useTablePagination(filtered, 10);

  async function handleToggleActive() {
    if (!token || !pendingDeactivate || !isAdmin) return;
    const nextActive = pendingDeactivate.is_active === false;
    setIsTogglingActive(true);
    try {
      const updated = await setPredictionActive(
        token,
        pendingDeactivate.id,
        nextActive,
      );
      setHistory((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, is_active: updated.is_active !== false }
            : item,
        ),
      );
      setPendingDeactivate(null);
      toast.success(
        nextActive ? "Prediction activated." : "Prediction deactivated.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to update prediction status.";
      toast.error(message);
    } finally {
      setIsTogglingActive(false);
    }
  }

  return (
    <PrivatePage
      title="Prediction History"
      description={
        isAdmin
          ? "All platform detections. Admins can deactivate records but cannot delete them."
          : isAdvisor
            ? "Your predictions and claims assigned to you for review."
            : "Your saved detections, including doctor corrections. History cannot be deleted."
      }
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Predictions
            </h2>
            <p className="text-sm text-[#475569]">
              {isAdmin
                ? "Search and filter every detection on the platform."
                : "Search, filter, and page through your detection records."}
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
                  placeholder={
                    isAdmin
                      ? "Search claim, user, doctor, ID, or source…"
                      : "Search claim, ID, or source..."
                  }
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
            <GlassTableHeaderCell>User</GlassTableHeaderCell>
            <GlassTableHeaderCell>Previous claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected sentence</GlassTableHeaderCell>
            <GlassTableHeaderCell>Label</GlassTableHeaderCell>
            <GlassTableHeaderCell>Source</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date</GlassTableHeaderCell>
            <GlassTableHeaderCell>
              {isAdvisor ? "Reviewed" : "Review"}
            </GlassTableHeaderCell>
            {isAdmin ? (
              <GlassTableHeaderCell>Status</GlassTableHeaderCell>
            ) : null}
            <GlassTableHeaderCell className="text-right">
              {isAdmin ? "Actions" : "Details"}
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <GlassTableRow key={index}>
                    <GlassTableCell colSpan={columnCount}>
                      <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              ) : pagination.pageItems.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell colSpan={columnCount}>
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
                pagination.pageItems.map((item) => {
                  const previous = item.original_claim_text || claimText(item);
                  const corrected = correctedText(item);
                  const isActive = item.is_active !== false;
                  return (
                  <GlassTableRow
                    key={item.id}
                    className={isActive ? undefined : "opacity-60"}
                  >
                    <GlassTableCell className="whitespace-nowrap">
                      <p className="font-medium text-[#0f172a]">
                        {item.user_name || "User"}
                      </p>
                      {item.user_email ? (
                        <p className="text-xs text-[#64748b]">
                          {item.user_email}
                        </p>
                      ) : null}
                    </GlassTableCell>
                    <GlassTableCell className="max-w-[280px]">
                      <p className="line-clamp-3 text-sm text-[#0f172a]">
                        {previous || "—"}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell className="max-w-[280px]">
                      {corrected ? (
                        <p className="line-clamp-3 text-sm font-medium text-[#0f172a]">
                          {corrected}
                        </p>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={labelTone(item.label)}>
                        {displayLabel(item.label)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {item.source || "Manual check"}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {formatDate(item.created_at)}
                    </GlassTableCell>
                    <GlassTableCell className="max-w-[220px]">
                      {isAdvisor ? (
                        item.review_status === "corrected" ||
                        item.review_status === "confirmed" ? (
                          <GlassBadge tone="info">
                            {item.advisor_name
                              ? `Reviewed by ${item.advisor_name}`
                              : "Reviewed"}
                          </GlassBadge>
                        ) : item.review_status === "pending" ||
                          item.review_status === "awaiting_assignment" ||
                          item.needs_review ? (
                          <span className="text-sm text-[#94a3b8]">Waiting</span>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )
                      ) : reviewLabel(item) ? (
                        <div className="space-y-1">
                          <GlassBadge tone={reviewTone(item.review_status)}>
                            {reviewLabel(item)}
                          </GlassBadge>
                          {item.advisor_name ? (
                            <p className="text-xs text-[#64748b]">
                              {item.advisor_name}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
                    </GlassTableCell>
                    {isAdmin ? (
                      <GlassTableCell>
                        <GlassBadge tone={isActive ? "success" : "danger"}>
                          {isActive ? "Active" : "Inactive"}
                        </GlassBadge>
                      </GlassTableCell>
                    ) : null}
                    <GlassTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ViewDetailsButton onClick={() => setDetailItem(item)} />
                        {isAdmin ? (
                          <TableIconButton
                            icon={isActive ? "block" : "check_circle"}
                            tone={isActive ? "danger" : "brand"}
                            onClick={() => setPendingDeactivate(item)}
                            disabled={
                              isTogglingActive &&
                              pendingDeactivate?.id === item.id
                            }
                            label={
                              isActive
                                ? `Deactivate prediction ${item.id}`
                                : `Activate prediction ${item.id}`
                            }
                          />
                        ) : null}
                      </div>
                    </GlassTableCell>
                  </GlassTableRow>
                  );
                })
              )}
            </GlassTableBody>
      </DataTableCard>

      <ViewDetailsModal
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title="Prediction details"
        fields={
          detailItem
            ? [
                { label: "ID", value: formatPredictionId(detailItem.id) },
                { label: "User", value: detailItem.user_name || "User" },
                { label: "Email", value: detailItem.user_email },
                {
                  label: "Previous claim",
                  value:
                    detailItem.original_claim_text || claimText(detailItem),
                },
                {
                  label: "Corrected sentence",
                  value: correctedText(detailItem),
                },
                { label: "Label", value: displayLabel(detailItem.label) },
                { label: "Source", value: detailItem.source || "Manual check" },
                { label: "Date", value: formatDate(detailItem.created_at) },
                {
                  label: "Review",
                  value:
                    reviewLabel(detailItem) ||
                    (detailItem.advisor_name
                      ? `Reviewed by ${detailItem.advisor_name}`
                      : "—"),
                },
                { label: "Doctor", value: detailItem.advisor_name },
                {
                  label: "Status",
                  value:
                    detailItem.is_active === false ? "Inactive" : "Active",
                },
              ]
            : []
        }
      />

      <DeleteAlertModal
        open={Boolean(pendingDeactivate)}
        onOpenChange={(open) => {
          if (!open && !isTogglingActive) setPendingDeactivate(null);
        }}
        title={
          pendingDeactivate?.is_active === false
            ? "Activate this prediction?"
            : "Deactivate this prediction?"
        }
        description={
          pendingDeactivate?.is_active === false
            ? "This prediction will become visible again for users and doctors."
            : "History records cannot be deleted. Deactivating hides this prediction from users and doctors without removing it."
        }
        itemLabel={
          pendingDeactivate
            ? formatPredictionId(pendingDeactivate.id)
            : undefined
        }
        confirmLabel={
          pendingDeactivate?.is_active === false
            ? "Yes, activate"
            : "Yes, deactivate"
        }
        isLoading={isTogglingActive}
        onConfirm={handleToggleActive}
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
