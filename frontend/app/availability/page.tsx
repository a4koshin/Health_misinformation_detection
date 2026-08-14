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
  createAvailability,
  deleteAvailability,
  formatSlotRange,
  listAvailability,
} from "@/lib/appointments";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { DoctorAvailability } from "@/types/api";

function todayInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = (hours || 0) * 60 + (mins || 0) + minutes;
  const next = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(next / 60)).padStart(2, "0");
  const mm = String(next % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function AvailabilityContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<DoctorAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayInput());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const starts = new Date(`${date}T${startTime}`);
    const ends = new Date(`${date}T${endTime}`);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      toast.error("Enter a valid date and time.");
      return;
    }
    setIsSaving(true);
    try {
      const created = await createAvailability(token, {
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      });
      setItems((current) => [...current, created]);
      setShowForm(false);
      toast.success("Available time added.");
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
      description="Publish the dates and times users can book after you correct a claim."
      actions={
        <GlassButton type="button" size="sm" onClick={() => setShowForm(true)}>
          <MaterialIcon name="schedule" size={18} />
          Add time
        </GlassButton>
      }
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Your open slots
            </h2>
            <p className="text-sm text-[#475569]">
              Users see these times when they book an appointment with you.
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
                    Add a date and time so users can book an appointment.
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
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(slot.booked) || deletingId === slot.id}
                    onClick={() => void handleDelete(slot)}
                  >
                    Remove
                  </GlassButton>
                </GlassTableCell>
              </GlassTableRow>
            ))
          )}
        </GlassTableBody>
      </DataTableCard>

      <GlassModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open && !isSaving) setShowForm(false);
        }}
        title="Add available time"
        description="Users will see this date and time when they book an appointment."
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
                required
                value={startTime}
                onChange={(event) => {
                  const next = event.target.value;
                  setStartTime(next);
                  setEndTime(addMinutes(next, 30));
                }}
              />
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="slot-end">End time</GlassLabel>
              <GlassInput
                id="slot-end"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <GlassButton
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save time"}
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
