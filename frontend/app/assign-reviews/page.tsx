"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassLabel,
  GlassSelect,
} from "@/components/glass/glass-input";
import { GlassModal } from "@/components/glass/glass-modal";
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
  assignReview,
  getAdminReviewQueue,
  listDoctors,
} from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { Detection, DoctorProfile } from "@/types/api";

type QueueFilter = "awaiting_assignment" | "pending" | "all";

function claimText(item: Detection) {
  return item.claim_text || item.input_text || "";
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

function AssignReviewsContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<Detection[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("awaiting_assignment");
  const [awaitingCount, setAwaitingCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<Detection | null>(null);
  const [doctorUserId, setDoctorUserId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const pagination = useTablePagination(items, 10);

  async function loadQueue(silent = false) {
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const [queue, doctorRows] = await Promise.all([
        getAdminReviewQueue(token, filter),
        listDoctors(token),
      ]);
      setItems(Array.isArray(queue.items) ? queue.items : []);
      setAwaitingCount(queue.awaiting_count ?? 0);
      setAssignedCount(queue.assigned_pending_count ?? 0);
      setDoctors(Array.isArray(doctorRows) ? doctorRows : []);
    } catch (error) {
      if (silent) return;
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to load claims waiting for assignment.";
      toast.error(message);
      setItems([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
    const timer = window.setInterval(() => {
      void loadQueue(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [token, filter]);

  function openAssign(item: Detection) {
    setActiveItem(item);
    setDoctorUserId(item.advisor_id || "");
  }

  function closeAssign() {
    if (isSaving) return;
    setActiveItem(null);
    setDoctorUserId("");
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !activeItem) return;
    if (!doctorUserId) {
      toast.error("Choose a doctor.");
      return;
    }

    setIsSaving(true);
    try {
      await assignReview(token, {
        prediction_id: activeItem.id,
        doctor_user_id: doctorUserId,
      });
      toast.success("Claim assigned to doctor.");
      closeAssign();
      await loadQueue(true);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to assign claim.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PrivatePage
      title="Assign reviews"
      description="Non-Reliable claims arrive here first. Choose which doctor should correct or confirm each one."
      actions={
        <div className="flex items-center gap-2">
          <GlassBadge tone="brand">{awaitingCount} awaiting</GlassBadge>
          <GlassBadge tone="info">{assignedCount} assigned</GlassBadge>
        </div>
      }
    >
      <DataTableCard
        header={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Assignment queue
              </h2>
              <p className="text-sm text-[#475569]">
                Assign each claim to one doctor. Only that doctor will see it in
                Review.
              </p>
            </div>
            <div className="space-y-1.5 sm:w-56">
              <GlassLabel htmlFor="assign-filter">Show</GlassLabel>
              <GlassSelect
                id="assign-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as QueueFilter)
                }
                className="rounded-xl bg-white"
              >
                <option value="awaiting_assignment">Awaiting assignment</option>
                <option value="pending">Assigned (waiting on doctor)</option>
                <option value="all">All open claims</option>
              </GlassSelect>
            </div>
          </div>
        }
        footer={
          !isLoading && items.length > 0 ? (
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
            <GlassTableHeaderCell>Status</GlassTableHeaderCell>
            <GlassTableHeaderCell>Doctor</GlassTableHeaderCell>
            <GlassTableHeaderCell>Created</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Action
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={6}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : items.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={6}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="assignment_ind" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No claims in this view
                  </p>
                  <p className="text-sm text-[#475569]">
                    When users get a Non-Reliable result, it will appear here for
                    assignment.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => (
              <GlassTableRow key={item.id}>
                <GlassTableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0f172a]">
                      {item.user_name || "User"}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {item.user_email || "—"}
                    </p>
                  </div>
                </GlassTableCell>
                <GlassTableCell className="max-w-[320px]">
                  <p className="line-clamp-2 text-sm text-[#0f172a]">
                    {claimText(item)}
                  </p>
                </GlassTableCell>
                <GlassTableCell>
                  {item.review_status === "awaiting_assignment" ? (
                    <GlassBadge tone="brand">Awaiting</GlassBadge>
                  ) : (
                    <GlassBadge tone="info">Assigned</GlassBadge>
                  )}
                </GlassTableCell>
                <GlassTableCell>
                  {item.advisor_name || "—"}
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-sm text-[#64748b]">
                  {formatDate(item.created_at)}
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <GlassButton
                    type="button"
                    size="sm"
                    onClick={() => openAssign(item)}
                  >
                    {item.advisor_id ? "Reassign" : "Assign"}
                  </GlassButton>
                </GlassTableCell>
              </GlassTableRow>
            ))
          )}
        </GlassTableBody>
      </DataTableCard>

      <GlassModal
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) closeAssign();
        }}
        title={activeItem?.advisor_id ? "Reassign doctor" : "Assign doctor"}
        description="Only the selected doctor will be able to correct or confirm this claim."
      >
        {activeItem ? (
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-[#334155]">
              <p className="font-medium text-[#0f172a]">
                {activeItem.user_name || "User"}
              </p>
              <p className="mt-1 line-clamp-4">{claimText(activeItem)}</p>
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="assign-doctor">Doctor</GlassLabel>
              <GlassSelect
                id="assign-doctor"
                value={doctorUserId}
                onChange={(event) => setDoctorUserId(event.target.value)}
                required
              >
                <option value="">Select a doctor…</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.user_id}>
                    {doctor.name}
                    {doctor.job_title ? ` — ${doctor.job_title}` : ""}
                    {doctor.email ? ` (${doctor.email})` : ""}
                  </option>
                ))}
              </GlassSelect>
              {doctors.length === 0 ? (
                <p className="text-sm text-red-600">
                  Create a doctor on the Doctors page before assigning.
                </p>
              ) : null}
            </div>
            <div className="flex gap-3 pt-1">
              <GlassButton
                type="submit"
                disabled={isSaving || doctors.length === 0}
              >
                {isSaving ? "Assigning…" : "Assign doctor"}
              </GlassButton>
              <GlassButton
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={closeAssign}
              >
                Cancel
              </GlassButton>
            </div>
          </form>
        ) : null}
      </GlassModal>
    </PrivatePage>
  );
}

export default function AssignReviewsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <AssignReviewsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
