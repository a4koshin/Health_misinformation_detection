"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
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
import {
  formatSlotRange,
  listAppointments,
  updateAppointmentStatus,
} from "@/lib/appointments";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { Appointment, AppointmentStatus } from "@/types/api";

function statusTone(status: AppointmentStatus) {
  if (status === "confirmed") return "success" as const;
  if (status === "declined") return "danger" as const;
  return "brand" as const;
}

function statusLabel(status: AppointmentStatus) {
  if (status === "confirmed") return "Confirmed";
  if (status === "declined") return "Declined";
  return "Requested";
}

function isPaid(item: Appointment) {
  return (item.payment_status || "").toLowerCase() === "paid";
}

function AppointmentsContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Appointment | null>(null);

  async function load() {
    if (!token) return;
    setIsLoading(true);
    try {
      setItems(await listAppointments(token));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to load appointments.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const pendingFirst = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        const aq = a.queue_number ?? Number.MAX_SAFE_INTEGER;
        const bq = b.queue_number ?? Number.MAX_SAFE_INTEGER;
        if (aq !== bq) return aq - bq;
        return (a.starts_at || "").localeCompare(b.starts_at || "");
      }),
    [items],
  );
  const pagination = useTablePagination(pendingFirst, 10);

  async function handleStatus(
    appointment: Appointment,
    status: "confirmed" | "declined",
  ) {
    if (!token) return;
    setUpdatingId(appointment.id);
    try {
      const updated = await updateAppointmentStatus(
        token,
        appointment.id,
        status,
      );
      setItems((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      toast.success(
        status === "confirmed"
          ? "Appointment confirmed."
          : "Appointment declined.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to update this appointment.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <PrivatePage
      title="Appointments"
      description="Users book one of your published times after a correction. Confirm or decline each request."
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Appointment requests
            </h2>
            <p className="text-sm text-[#475569]">
              Confirm or decline requests tied to claims you corrected.
            </p>
          </div>
        }
        footer={
          !isLoading && pendingFirst.length > 0 ? (
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
            <GlassTableHeaderCell>Queue</GlassTableHeaderCell>
            <GlassTableHeaderCell>User</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>Note</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date and time</GlassTableHeaderCell>
            <GlassTableHeaderCell>Status</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Actions
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={7}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={7}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="event_available" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No appointment requests
                  </p>
                  <p className="text-sm text-[#475569]">
                    When a user needs more information about a correction, their
                    request will appear here.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => (
              <GlassTableRow key={item.id}>
                <GlassTableCell>
                  {item.queue_number != null ? (
                    <span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-[#ff5c00]/10 px-2.5 py-1 text-sm font-semibold text-[#cc4a00]">
                      #{item.queue_number}
                    </span>
                  ) : (
                    <span className="text-sm text-[#94a3b8]">—</span>
                  )}
                </GlassTableCell>
                <GlassTableCell>
                  <p className="font-medium text-[#0f172a]">
                    {item.user_name || "User"}
                  </p>
                  {item.user_email ? (
                    <p className="text-xs text-[#64748b]">{item.user_email}</p>
                  ) : null}
                </GlassTableCell>
                <GlassTableCell className="max-w-[280px]">
                  <p className="line-clamp-3 text-sm text-[#0f172a]">
                    {item.corrected_claim_text || item.claim_text || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="max-w-[240px]">
                  <p className="line-clamp-3 text-sm text-[#475569]">
                    {item.note || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {formatSlotRange(item.starts_at, item.ends_at)}
                </GlassTableCell>
                <GlassTableCell>
                  <div className="flex flex-col items-start gap-1">
                    <GlassBadge tone={statusTone(item.status)}>
                      {statusLabel(item.status)}
                    </GlassBadge>
                    {isPaid(item) ? (
                      <GlassBadge tone="success">Paid</GlassBadge>
                    ) : null}
                  </div>
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ViewDetailsButton onClick={() => setDetailItem(item)} />
                    {item.status === "pending" ? (
                      <>
                        {isPaid(item) ? null : (
                          <GlassButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={updatingId === item.id}
                            onClick={() => void handleStatus(item, "declined")}
                          >
                            Decline
                          </GlassButton>
                        )}
                        <GlassButton
                          type="button"
                          size="sm"
                          disabled={updatingId === item.id}
                          onClick={() => void handleStatus(item, "confirmed")}
                        >
                          Confirm
                        </GlassButton>
                      </>
                    ) : null}
                  </div>
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
        title="Appointment details"
        fields={
          detailItem
            ? [
                {
                  label: "Queue",
                  value:
                    detailItem.queue_number != null
                      ? `#${detailItem.queue_number}`
                      : "—",
                },
                { label: "User", value: detailItem.user_name || "User" },
                { label: "Email", value: detailItem.user_email },
                {
                  label: "Corrected claim",
                  value:
                    detailItem.corrected_claim_text ||
                    detailItem.claim_text ||
                    "—",
                },
                { label: "Note", value: detailItem.note },
                {
                  label: "Date and time",
                  value: formatSlotRange(
                    detailItem.starts_at,
                    detailItem.ends_at,
                  ),
                },
                { label: "Status", value: statusLabel(detailItem.status) },
                { label: "Payment", value: detailItem.payment_status },
                { label: "Amount", value: detailItem.payment_amount },
                { label: "Phone", value: detailItem.payer_phone },
              ]
            : []
        }
      />
    </PrivatePage>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute roles={["doctor"]}>
      <AppShell>
        <AppointmentsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
