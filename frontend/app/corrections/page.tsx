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
  GlassTextarea,
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
  createAppointment,
  formatSlotDate,
  formatSlotRange,
  formatSlotTime,
  listAppointments,
  listAvailability,
  slotDateKey,
  slotDateParts,
  slotDurationLabel,
} from "@/lib/appointments";
import { ApiError } from "@/lib/api";
import { getCorrections } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Appointment, Detection, DoctorAvailability } from "@/types/api";

function formatDate(value: string | null | undefined) {
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

function previousClaim(item: Detection) {
  return (item.original_claim_text || item.claim_text || item.input_text || "").trim();
}

function correctedClaim(item: Detection) {
  const rewritten = (item.corrected_claim_text || "").trim();
  if (rewritten) return rewritten;
  if (item.review_status === "corrected") {
    return (item.advisor_note || "").trim();
  }
  return "";
}

function BookingSlotPicker({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: DoctorAvailability[];
  selectedSlotId: string;
  onSelect: (id: string) => void;
}) {
  const groups = slots.reduce<
    {
      key: string;
      weekday: string;
      day: string;
      month: string;
      label: string;
      slots: DoctorAvailability[];
    }[]
  >((list, slot) => {
    const parts = slotDateParts(slot.starts_at);
    const existing = list.find((group) => group.key === parts.key);
    if (existing) existing.slots.push(slot);
    else list.push({ ...parts, slots: [slot] });
    return list;
  }, []);
  const selected = slots.find((slot) => slot.id === selectedSlotId) ?? slots[0];
  const selectedKey = slotDateKey(selected.starts_at);
  const times = groups.find((group) => group.key === selectedKey)?.slots ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#0f172a]">Date</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => {
            const active = group.key === selectedKey;
            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(group.slots[0].id)}
                className={
                  active
                    ? "flex min-h-14 w-[54px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-[#ff5c00] bg-[#ff5c00] px-1.5 py-1.5 text-white"
                    : "flex min-h-14 w-[54px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-1.5 py-1.5 text-[#0f172a] hover:border-[#ff5c00]/40"
                }
              >
                <span
                  className={
                    active
                      ? "text-[10px] font-semibold text-white/90"
                      : "text-[10px] font-semibold text-[#64748b]"
                  }
                >
                  {group.weekday}
                </span>
                <span className="text-base font-bold leading-none">{group.day}</span>
                <span
                  className={
                    active ? "text-[10px] text-white/90" : "text-[10px] text-[#475569]"
                  }
                >
                  {group.month}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#0f172a]">
          Time · {formatSlotDate(selected.starts_at)}
        </p>
        <div className="grid gap-2">
          {times.map((slot) => {
            const active = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(slot.id)}
                className={
                  active
                    ? "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#ff5c00] bg-[#ffefe6] px-2.5 py-2 text-left"
                    : "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-left hover:border-[#ff5c00]/40"
                }
              >
                <span
                  className={
                    active
                      ? "flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#ff5c00]"
                      : "flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#ffefe6] text-[#cc4a00]"
                  }
                >
                  <MaterialIcon name="schedule" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#0f172a]">
                    {formatSlotTime(slot.starts_at)} – {formatSlotTime(slot.ends_at)}
                  </span>
                  <span className="block text-[11px] text-[#64748b]">
                    {slotDurationLabel(slot.starts_at, slot.ends_at)}
                  </span>
                </span>
                <span
                  className={
                    active
                      ? "size-4 shrink-0 rounded-full border-[4px] border-[#ff5c00]"
                      : "size-4 shrink-0 rounded-full border-2 border-gray-300"
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CorrectionsContent() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isUser = user?.role === "user";
  const historyRevision = useChatStore((state) => state.historyRevision);
  const [items, setItems] = useState<Detection[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookingItem, setBookingItem] = useState<Detection | null>(null);
  const [bookingNote, setBookingNote] = useState("");
  const [slots, setSlots] = useState<DoctorAvailability[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const columnCount = isAdmin ? 5 : isUser ? 5 : 4;

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setItems([]);
          setPendingCount(0);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const [data, booked] = await Promise.all([
          getCorrections(token),
          isUser ? listAppointments(token) : Promise.resolve([]),
        ]);
        const rows = Array.isArray(data.items) ? data.items : [];
        const corrections = rows.filter((item) => Boolean(correctedClaim(item)));
        if (active) {
          setItems(corrections);
          setAppointments(booked);
          setPendingCount(data.pending_count ?? 0);
        }
      } catch {
        if (active) {
          setItems([]);
          setPendingCount(0);
          toast.error("Unable to load corrections.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token, historyRevision, isUser]);

  const appointmentByPrediction = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const row of appointments) {
      const current = map.get(row.prediction_id);
      if (!current || (row.created_at || "") > (current.created_at || "")) {
        map.set(row.prediction_id, row);
      }
    }
    return map;
  }, [appointments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        previousClaim(item),
        correctedClaim(item),
        item.advisor_name ?? "",
        item.user_name ?? "",
        item.user_email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const pagination = useTablePagination(filtered, 10);

  async function openBooking(item: Detection) {
    setBookingNote("");
    setSelectedSlotId("");
    setSlots([]);
    setBookingItem(item);
    if (!token || !item.advisor_id) return;
    setIsLoadingSlots(true);
    try {
      const available = await listAvailability(token, item.advisor_id);
      setSlots(available);
      setSelectedSlotId(available[0]?.id ?? "");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to load this doctor's available times.",
      );
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function handleBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !bookingItem) return;
    if (!selectedSlotId) {
      toast.error("Pick an available date and time.");
      return;
    }
    setIsBooking(true);
    try {
      const created = await createAppointment(token, {
        prediction_id: bookingItem.id,
        availability_id: selectedSlotId,
        note: bookingNote.trim() || undefined,
      });
      setAppointments((current) => [created, ...current]);
      setBookingItem(null);
      setBookingNote("");
      setSelectedSlotId("");
      toast.success(
        `Appointment requested with ${bookingItem.advisor_name || "the doctor"}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Unable to book this appointment.",
      );
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <PrivatePage
      title="Doctor corrections"
      description={
        isAdmin
          ? "All doctor rewrites across the platform — original claim, correction, user, and doctor."
          : "Your original claims next to the doctor rewrite. Book an appointment if you need more information."
      }
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Corrected sentences
            </h2>
            <p className="text-sm text-[#475569]">
              {isAdmin
                ? "Every claim a doctor corrected appears here for admin oversight."
                : "Only claims a Doctor corrected appear here."}
            </p>
          </div>
        }
        toolbar={
          <div className="space-y-1.5">
            <GlassLabel htmlFor="corrections-search">Search</GlassLabel>
            <div className="relative">
              <MaterialIcon
                name="search"
                size={18}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
              />
              <GlassInput
                id="corrections-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isAdmin
                    ? "Search claim, correction, user, or doctor…"
                    : "Search original claim, correction, or doctor…"
                }
                className="rounded-xl bg-white pl-10"
              />
            </div>
          </div>
        }
        footer={
          !isLoading && filtered.length > 0 ? (
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
            {isAdmin ? (
              <GlassTableHeaderCell>User</GlassTableHeaderCell>
            ) : null}
            <GlassTableHeaderCell>Previous claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected sentence</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected by</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date and Time</GlassTableHeaderCell>
            {isUser ? (
              <GlassTableHeaderCell className="text-right">
                Appointment
              </GlassTableHeaderCell>
            ) : null}
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
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
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="rate_review" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No corrections yet
                  </p>
                  <p className="text-sm text-[#475569]">
                    {pendingCount > 0
                      ? `${pendingCount} Non-Reliable claim${pendingCount === 1 ? "" : "s"} still waiting for doctor review. After a doctor submits a rewrite, it will appear here.`
                      : isAdmin
                        ? "When a doctor corrects a Non-Reliable claim, it will show up here."
                        : "When a Doctor rewrites one of your Non-Reliable claims, it will show up here."}
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => {
              const appointment = appointmentByPrediction.get(item.id);
              const status = appointment?.status;
              return (
              <GlassTableRow key={item.id}>
                {isAdmin ? (
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
                ) : null}
                <GlassTableCell className="max-w-[320px]">
                  <p className="line-clamp-4 text-sm text-[#0f172a]">
                    {previousClaim(item) || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="max-w-[320px]">
                  <p className="line-clamp-4 text-sm font-medium text-[#0f172a]">
                    {correctedClaim(item) || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap">
                  <p className="font-medium text-[#0f172a]">
                    {item.advisor_name || "Doctor"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {formatDate(item.reviewed_at || item.created_at)}
                </GlassTableCell>
                {isUser ? (
                  <GlassTableCell className="text-right">
                    {status === "pending" ? (
                      <div className="space-y-1">
                        <GlassBadge tone="brand">Requested</GlassBadge>
                        {appointment?.starts_at ? (
                          <p className="text-xs text-[#64748b]">
                            {formatSlotRange(
                              appointment.starts_at,
                              appointment.ends_at,
                            )}
                          </p>
                        ) : null}
                      </div>
                    ) : status === "confirmed" ? (
                      <div className="space-y-1">
                        <GlassBadge tone="success">Confirmed</GlassBadge>
                        {appointment?.starts_at ? (
                          <p className="text-xs text-[#64748b]">
                            {formatSlotRange(
                              appointment.starts_at,
                              appointment.ends_at,
                            )}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <GlassButton
                        type="button"
                        size="sm"
                        onClick={() => void openBooking(item)}
                        disabled={!item.advisor_id}
                      >
                        Book appointment
                      </GlassButton>
                    )}
                  </GlassTableCell>
                ) : null}
              </GlassTableRow>
              );
            })
          )}
        </GlassTableBody>
      </DataTableCard>

      <GlassModal
        open={Boolean(bookingItem)}
        onOpenChange={(open) => {
          if (!open && !isBooking) {
            setBookingItem(null);
            setBookingNote("");
            setSelectedSlotId("");
            setSlots([]);
          }
        }}
        title="Book an appointment"
        description={
          bookingItem
            ? `Choose one of ${bookingItem.advisor_name || "this doctor"}'s available times.`
            : undefined
        }
      >
        {bookingItem ? (
          <form onSubmit={handleBook} className="space-y-4">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-[#64748b]">
                Corrected sentence
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#0f172a]">
                {correctedClaim(bookingItem)}
              </p>
            </div>
            <div>
              {isLoadingSlots ? (
                <p className="text-sm text-[#64748b]">Loading times…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-[#64748b]">
                  This doctor has not published any open times yet.
                </p>
              ) : (
                <BookingSlotPicker
                  slots={slots}
                  selectedSlotId={selectedSlotId}
                  onSelect={setSelectedSlotId}
                />
              )}
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="appointment-note">
                What would you like to know? (optional)
              </GlassLabel>
              <GlassTextarea
                id="appointment-note"
                value={bookingNote}
                maxLength={800}
                onChange={(event) => setBookingNote(event.target.value)}
                placeholder="Ask about this topic, treatment, or anything that is still unclear."
              />
            </div>
            <div className="flex justify-end gap-2">
              <GlassButton
                type="button"
                variant="ghost"
                disabled={isBooking}
                onClick={() => {
                  setBookingItem(null);
                  setBookingNote("");
                  setSelectedSlotId("");
                  setSlots([]);
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={isBooking || isLoadingSlots || !selectedSlotId}
              >
                {isBooking ? "Sending…" : "Book time"}
              </GlassButton>
            </div>
          </form>
        ) : null}
      </GlassModal>
    </PrivatePage>
  );
}

export default function CorrectionsPage() {
  return (
    <ProtectedRoute roles={["user", "admin"]}>
      <AppShell>
        <CorrectionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
