"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassInput,
  GlassLabel,
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
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import {
  createAvailability,
  deleteAvailability,
  formatSlotRange,
  listAvailability,
} from "@/lib/appointments";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { DoctorAvailability } from "@/types/api";

const SLOT_MINUTES = 60;

function todayInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function timeToMinutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

function slotCount(startTime: string, endTime: string) {
  const total = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (total < SLOT_MINUTES || total % SLOT_MINUTES !== 0) return 0;
  return total / SLOT_MINUTES;
}

function AvailabilityContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<DoctorAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayInput());
  const [startTime, setStartTime] = useState("11:00");
  const [endTime, setEndTime] = useState("20:00");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<DoctorAvailability | null>(null);

  async function load() {
    if (!token) return;
    setIsLoading(true);
    try {
      setItems(await listAvailability(token));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to load available times.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const upcoming = useMemo(
    () =>
      [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [items],
  );
  const pagination = useTablePagination(upcoming, 10);
  const previewCount = slotCount(startTime, endTime);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const starts = new Date(`${date}T${startTime}`);
    const ends = new Date(`${date}T${endTime}`);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      toast.error("Enter a valid date and time.");
      return;
    }
    if (previewCount < 1) {
      toast.error(
        "Working hours must be at least 1 hour and split evenly into 1-hour slots.",
      );
      return;
    }
    setIsSaving(true);
    try {
      const created = await createAvailability(token, {
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      });
      setItems((current) => [...current, ...created]);
      setShowForm(false);
      toast.success(
        created.length === 1
          ? "1 patient slot added (1 hour)."
          : `${created.length} patient slots added (1 hour each).`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to add this time.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(slot: DoctorAvailability) {
    if (!token || slot.booked) return;
    setDeletingId(slot.id);
    try {
      await deleteAvailability(token, slot.id);
      setItems((current) => current.filter((row) => row.id !== slot.id));
      toast.success("Available time removed.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to remove this time.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PrivatePage
      title="Available times"
      description="Publish your working hours once (for example 11:00–20:00). Patients book one 1-hour slot at a time."
      actions={
        <GlassButton type="button" size="sm" onClick={() => setShowForm(true)}>
          <MaterialIcon name="schedule" size={18} />
          Add hours
        </GlassButton>
      }
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Your open 1-hour slots
            </h2>
            <p className="text-sm text-[#475569]">
              Each row is one patient appointment. Booked slots stay reserved.
            </p>
          </div>
        }
        footer={
          !isLoading && upcoming.length > 0 ? (
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
                <GlassTableCell colSpan={3}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={3}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="schedule" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No available times yet
                  </p>
                  <p className="text-sm text-[#475569]">
                    Add working hours so users can book 1-hour appointments.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((slot) => (
              <GlassTableRow key={slot.id}>
                <GlassTableCell className="font-medium text-[#0f172a]">
                  {formatSlotRange(slot.starts_at, slot.ends_at)}
                </GlassTableCell>
                <GlassTableCell>
                  <GlassBadge tone={slot.booked ? "brand" : "success"}>
                    {slot.booked ? "Booked" : "Open"}
                  </GlassBadge>
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ViewDetailsButton onClick={() => setDetailItem(slot)} />
                    <GlassButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(slot.booked) || deletingId === slot.id}
                      onClick={() => void handleDelete(slot)}
                    >
                      Remove
                    </GlassButton>
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
        title="Slot details"
        fields={
          detailItem
            ? [
                {
                  label: "Date and time",
                  value: formatSlotRange(
                    detailItem.starts_at,
                    detailItem.ends_at,
                  ),
                },
                {
                  label: "Status",
                  value: detailItem.booked ? "Booked" : "Open",
                },
                { label: "Created", value: detailItem.created_at },
              ]
            : []
        }
      />

      <GlassModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open && !isSaving) setShowForm(false);
        }}
        title="Add working hours"
        description="Enter the full day window you are available. We split it into 1-hour patient slots automatically."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <GlassLabel htmlFor="slot-date">Date</GlassLabel>
            <GlassInput
              id="slot-date"
              type="date"
              required
              min={todayInput()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <GlassLabel htmlFor="slot-start">Start time</GlassLabel>
              <GlassInput
                id="slot-start"
                type="time"
                step={3600}
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="slot-end">End time</GlassLabel>
              <GlassInput
                id="slot-end"
                type="time"
                step={3600}
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-[#475569]">
            {previewCount > 0
              ? `This creates ${previewCount} patient slot${previewCount === 1 ? "" : "s"} of 1 hour each.`
              : "Use times like 11:00–20:00 so the window divides evenly into 1-hour slots."}
          </p>
          <div className="flex justify-end gap-2">
            <GlassButton
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={isSaving || previewCount < 1}>
              {isSaving ? "Saving…" : "Save hours"}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </PrivatePage>
  );
}

export default function AvailabilityPage() {
  return (
    <ProtectedRoute roles={["doctor"]}>
      <AppShell>
        <AvailabilityContent />
      </AppShell>
    </ProtectedRoute>
  );
}
