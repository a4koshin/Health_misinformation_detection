"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { DataTableCard } from "@/components/glass/data-table-card";
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
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import { listAuditLogs } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { AuditLog } from "@/types/api";

type ActionFilter = "all" | "auth" | "prediction" | "review" | "report";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    "user.register": "Registered",
    "user.login": "Signed in",
    "user.login_failed": "Login failed",
    "user.create": "Created user",
    "user.update": "Updated user",
    "user.delete": "Deleted user",
    "user.deactivate": "Deactivated user",
    "user.activate": "Activated user",
    "user.profile_update": "Updated profile",
    "prediction.create": "Prediction",
    "prediction.delete": "Deleted prediction",
    "prediction.deactivate": "Deactivated prediction",
    "prediction.activate": "Activated prediction",
    "review.queued": "Awaiting doctor assignment",
    "review.assigned": "Assigned to doctor",
    "review.corrected": "Claim corrected",
    "appointment.requested": "Appointment requested",
    "appointment.confirmed": "Appointment confirmed",
    "appointment.declined": "Appointment declined",
    "report.download": "Downloaded report",
  };
  return map[action] ?? action;
}

function actionTone(action: string) {
  if (action.includes("failed") || action.includes("delete")) {
    return "danger" as const;
  }
  if (action.includes("login") || action.includes("register")) {
    return "brand" as const;
  }
  if (action.includes("prediction")) {
    return "success" as const;
  }
  if (action.startsWith("review.")) {
    return "info" as const;
  }
  return "neutral" as const;
}

function actionGroup(action: string): Exclude<ActionFilter, "all"> {
  if (action.startsWith("user.")) return "auth";
  if (action.startsWith("prediction.")) return "prediction";
  if (action.startsWith("review.")) return "review";
  if (action.startsWith("report.")) return "report";
  return "auth";
}

function AuditLogContent() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [detailItem, setDetailItem] = useState<AuditLog | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      if (!token) {
        if (active) {
          setLogs([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const items = await listAuditLogs(token);
        if (active) setLogs(Array.isArray(items) ? items : []);
      } catch (error) {
        if (active) {
          setLogs([]);
          const message =
            error instanceof ApiError
              ? error.message
              : "Unable to load audit logs.";
          toast.error(message);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadLogs();
    return () => {
      active = false;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((item) => {
      if (actionFilter !== "all" && actionGroup(item.action) !== actionFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        item.actor_email ?? "",
        item.action,
        actionLabel(item.action),
        item.entity_type ?? "",
        item.entity_id ?? "",
        item.details ?? "",
        item.ip_address ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [logs, search, actionFilter]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <PrivatePage
      title="Audit log"
      description="Sign-ins, predictions, doctor reviews, and report downloads in one place."
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Recorded actions
            </h2>
            <p className="text-sm text-[#475569]">
              Search and filter every recorded action on the platform.
            </p>
          </div>
        }
        toolbar={
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <GlassLabel htmlFor="audit-search">Search</GlassLabel>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
                />
                <GlassInput
                  id="audit-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user, action, details, or IP..."
                  className="rounded-xl bg-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <GlassLabel htmlFor="audit-action">Action type</GlassLabel>
              <GlassSelect
                id="audit-action"
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value as ActionFilter)
                }
                className="rounded-xl bg-white"
              >
                <option value="all">All actions</option>
                <option value="auth">Auth</option>
                <option value="prediction">Predictions</option>
                <option value="review">Doctor reviews</option>
                <option value="report">Reports</option>
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
                <GlassTableHeaderCell>When</GlassTableHeaderCell>
                <GlassTableHeaderCell>User</GlassTableHeaderCell>
                <GlassTableHeaderCell>Action</GlassTableHeaderCell>
                <GlassTableHeaderCell>Details</GlassTableHeaderCell>
                <GlassTableHeaderCell>IP</GlassTableHeaderCell>
                <GlassTableHeaderCell className="text-right">
                  Details
                </GlassTableHeaderCell>
              </GlassTableRow>
            </GlassTableHead>
            <GlassTableBody>
              {isLoading ? (
                <GlassTableRow>
                  <GlassTableCell
                    colSpan={6}
                    className="py-12 text-center text-[#64748b]"
                  >
                    Loading audit events…
                  </GlassTableCell>
                </GlassTableRow>
              ) : pagination.pageItems.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell
                    colSpan={6}
                    className="py-12 text-center text-[#64748b]"
                  >
                    No audit events match your filters.
                  </GlassTableCell>
                </GlassTableRow>
              ) : (
                pagination.pageItems.map((item) => (
                  <GlassTableRow key={item.id}>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {formatDate(item.created_at)}
                    </GlassTableCell>
                    <GlassTableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0f172a]">
                          {item.actor_email || "Unknown"}
                        </p>
                        {item.entity_type ? (
                          <p className="truncate text-xs text-[#94a3b8]">
                            {item.entity_type}
                            {item.entity_id ? ` #${item.entity_id}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={actionTone(item.action)}>
                        {actionLabel(item.action)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="max-w-md">
                      <p className="line-clamp-2 text-[#475569]">
                        {item.details || "—"}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#64748b]">
                      {item.ip_address || "—"}
                    </GlassTableCell>
                    <GlassTableCell className="text-right">
                      <ViewDetailsButton onClick={() => setDetailItem(item)} />
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              )}
            </GlassTableBody>
      </DataTableCard>

      <ViewDetailsModal
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title="Audit event"
        fields={
          detailItem
            ? [
                { label: "When", value: formatDate(detailItem.created_at) },
                { label: "User", value: detailItem.actor_email },
                { label: "Action", value: actionLabel(detailItem.action) },
                {
                  label: "Entity",
                  value: detailItem.entity_type
                    ? `${detailItem.entity_type}${detailItem.entity_id ? ` #${detailItem.entity_id}` : ""}`
                    : "—",
                },
                { label: "Details", value: detailItem.details },
                { label: "IP", value: detailItem.ip_address },
              ]
            : []
        }
      />
    </PrivatePage>
  );
}

export default function AuditLogPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <AuditLogContent />
      </AppShell>
    </ProtectedRoute>
  );
}
