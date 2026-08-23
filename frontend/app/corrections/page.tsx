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
import { PaymentResultModal } from "@/components/glass/payment-result-modal";
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
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
  getAppointmentPaymentConfig,
  listAppointments,
  listAvailability,
  slotDateKey,
  slotDateParts,
  type AppointmentPaymentConfig,
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
  return (
    item.original_claim_text ||
    item.claim_text ||
    item.input_text ||
    ""
  ).trim();
}

function correctedClaim(item: Detection) {
  const rewritten = (item.corrected_claim_text || "").trim();
  if (rewritten) return rewritten;
  if (item.review_status === "corrected") {
    return (item.advisor_note || "").trim();
  }
  return "";
}

function displayLabel(label: string | null | undefined) {
  const value = (label || "").trim();
  if (!value) return "—";
  if (value === "Misinformation") return "Non-Reliable";
  return value;
}

function labelTone(label: string | null | undefined) {
  const value = displayLabel(label);
  if (value === "Reliable") return "success" as const;
  if (value === "Non-Reliable") return "danger" as const;
  return "neutral" as const;
}

function aiLabeled(item: Detection) {
  const stored = displayLabel(item.ai_label);
  if (stored !== "—") return stored;
  return "Non-Reliable";
}

function doctorLabeled(item: Detection) {
  const stored = displayLabel(item.doctor_label);
  if (stored !== "—") return stored;
  return "Reliable";
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
                <span className="text-base font-bold leading-none">
                  {group.day}
                </span>
                <span
                  className={
                    active
                      ? "text-[10px] text-white/90"
                      : "text-[10px] text-[#475569]"
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
        <div className="flex flex-wrap gap-2">
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
                    ? "flex min-w-[76px] cursor-pointer flex-col items-center justify-center rounded-xl border border-[#ff5c00] bg-[#ff5c00] px-3 py-2.5 text-white"
                    : "flex min-w-[76px] cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[#0f172a] hover:border-[#ff5c00]/40"
                }
              >
                <span className="text-[13px] font-bold leading-none">
                  {formatSlotTime(slot.starts_at)}
                </span>
                <span
                  className={
                    active
                      ? "mt-1 text-[11px] font-medium text-white/90"
                      : "mt-1 text-[11px] font-medium text-[#64748b]"
                  }
                >
                  {formatSlotTime(slot.ends_at)}
                </span>
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
  const [payerPhone, setPayerPhone] = useState("");
  const [paymentConfig, setPaymentConfig] =
    useState<AppointmentPaymentConfig | null>(null);
  const [slots, setSlots] = useState<DoctorAvailability[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [resultModal, setResultModal] = useState<{
    tone: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<Detection | null>(null);
  const columnCount = isAdmin ? 8 : isUser ? 8 : 7;

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
        const corrections = rows.filter((item) =>
          Boolean(correctedClaim(item)),
        );
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
        aiLabeled(item),
        doctorLabeled(item),
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
    setPayerPhone("");
    setSelectedSlotId("");
    setSlots([]);
    setPaymentConfig(null);
    setBookingItem(item);
    if (!token || !item.advisor_id) return;
    setIsLoadingSlots(true);
    try {
      const [available, pay] = await Promise.all([
        listAvailability(token, item.advisor_id),
        getAppointmentPaymentConfig(token).catch(() => null),
      ]);
      setSlots(available);
      setSelectedSlotId(available[0]?.id ?? "");
      setPaymentConfig(pay);
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
    if (paymentConfig?.enabled && !payerPhone.trim()) {
      toast.error("Enter your EVC Plus number to pay.");
      return;
    }
    setIsBooking(true);
    const paying = Boolean(paymentConfig?.enabled);
    const doctorName = bookingItem.advisor_name || "the doctor";
    try {
      const created = await createAppointment(token, {
        prediction_id: bookingItem.id,
        availability_id: selectedSlotId,
        note: bookingNote.trim() || undefined,
        payer_phone: payerPhone.trim() || undefined,
      });
      setAppointments((current) => [created, ...current]);
      setBookingItem(null);
      setBookingNote("");
      setPayerPhone("");
      setSelectedSlotId("");
      setPaymentConfig(null);
      const queueLabel =
        created.queue_number != null ? ` Queue #${created.queue_number}.` : "";
      setResultModal({
        tone: "success",
        title: paying ? "Payment successful" : "Appointment requested",
        message: paying
          ? `EVC Plus payment received. Appointment requested with ${doctorName}.${queueLabel}`
          : `Appointment requested with ${doctorName}.${queueLabel}`,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to book this appointment.";
      setResultModal({
        tone: "error",
        title: paying ? "Payment failed" : "Booking failed",
        message,
      });
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
        className="w-full shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        tableClassName="table-fixed min-w-[980px]"
        header={
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Corrected sentences
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {isAdmin
                  ? "Every claim a doctor corrected appears here for admin oversight."
                  : "Compare the original claim with the doctor rewrite, then book if you need help."}
              </p>
            </div>
            {!isLoading && filtered.length > 0 ? (
              <p className="text-xs font-medium text-[#94a3b8]">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        }
        toolbar={
          <div className="relative max-w-xl">
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
          <GlassTableRow className="hover:bg-transparent">
            {isAdmin ? (
              <GlassTableHeaderCell className="w-[14%]">
                User
              </GlassTableHeaderCell>
            ) : null}
            <GlassTableHeaderCell className={isAdmin ? "w-[18%]" : "w-[22%]"}>
              Previous claim
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className={isAdmin ? "w-[18%]" : "w-[22%]"}>
              Corrected sentence
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="w-[10%]">
              AI labeled
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="w-[10%]">
              Doctor labeled
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="w-[12%]">
              Corrected by
            </GlassTableHeaderCell>
            <GlassTableHeaderCell className="w-[14%]">
              Date &amp; time
            </GlassTableHeaderCell>
            {isUser ? (
              <GlassTableHeaderCell className="w-[16%] text-right">
                Appointment
              </GlassTableHeaderCell>
            ) : null}
            <GlassTableHeaderCell className="w-[8%] text-right">
              Details
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index} className="hover:bg-transparent">
                <GlassTableCell colSpan={columnCount}>
                  <div className="h-12 animate-pulse rounded-xl bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow className="hover:bg-transparent">
              <GlassTableCell colSpan={columnCount}>
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="rate_review" size={24} />
                  </span>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    No corrections yet
                  </p>
                  <p className="max-w-md text-sm leading-relaxed text-[#64748b]">
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
                <GlassTableRow key={item.id} className="align-top">
                  {isAdmin ? (
                    <GlassTableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0f172a]">
                          {item.user_name || "User"}
                        </p>
                        <p className="truncate text-xs text-[#94a3b8]">
                          {item.user_email || "—"}
                        </p>
                      </div>
                    </GlassTableCell>
                  ) : null}
                  <GlassTableCell>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[#475569]">
                      {previousClaim(item) || "—"}
                    </p>
                  </GlassTableCell>
                  <GlassTableCell>
                    <p className="line-clamp-3 text-sm leading-relaxed font-medium text-[#0f172a]">
                      {correctedClaim(item) || "—"}
                    </p>
                  </GlassTableCell>
                  <GlassTableCell>
                    <GlassBadge tone={labelTone(aiLabeled(item))}>
                      {aiLabeled(item)}
                    </GlassBadge>
                  </GlassTableCell>
                  <GlassTableCell>
                    <GlassBadge tone={labelTone(doctorLabeled(item))}>
                      {doctorLabeled(item)}
                    </GlassBadge>
                  </GlassTableCell>
                  <GlassTableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ff5c00]/10 text-xs font-semibold text-[#cc4a00]">
                        {(item.advisor_name || "D")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <p className="truncate text-sm font-medium text-[#0f172a]">
                        {item.advisor_name || "Doctor"}
                      </p>
                    </div>
                  </GlassTableCell>
                  <GlassTableCell>
                    <p className="text-sm whitespace-nowrap text-[#64748b]">
                      {formatDate(item.reviewed_at || item.created_at)}
                    </p>
                  </GlassTableCell>
                  {isUser ? (
                    <GlassTableCell className="text-right">
                      {status === "pending" ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <GlassBadge tone="brand">Requested</GlassBadge>
                          {appointment?.queue_number != null ? (
                            <span className="text-xs font-semibold text-[#cc4a00]">
                              Queue #{appointment.queue_number}
                            </span>
                          ) : null}
                          {appointment?.starts_at ? (
                            <span className="max-w-[11rem] text-right text-[11px] leading-snug text-[#94a3b8]">
                              {formatSlotRange(
                                appointment.starts_at,
                                appointment.ends_at,
                              )}
                            </span>
                          ) : null}
                        </div>
                      ) : status === "confirmed" ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <GlassBadge tone="success">Confirmed</GlassBadge>
                          {appointment?.queue_number != null ? (
                            <span className="text-xs font-semibold text-emerald-700">
                              Queue #{appointment.queue_number}
                            </span>
                          ) : null}
                          {appointment?.starts_at ? (
                            <span className="max-w-[11rem] text-right text-[11px] leading-snug text-[#94a3b8]">
                              {formatSlotRange(
                                appointment.starts_at,
                                appointment.ends_at,
                              )}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end gap-1.5">
                          <GlassButton
                            type="button"
                            size="sm"
                            title="Hadii aad u baahantahay talooyin caafimaad oo dheeri ah kuna saabsan mowduucaan waxaa qabsataa balan si aad ula kulanto dhakhtarka"
                            onClick={() => void openBooking(item)}
                            disabled={!item.advisor_id}
                          >
                            <MaterialIcon name="event" size={16} />
                            Book
                          </GlassButton>
                          <p className="max-w-[11rem] text-right text-[10px] leading-snug text-[#94a3b8]">
                            Qabsato balan dhakhtarka
                          </p>
                        </div>
                      )}
                    </GlassTableCell>
                  ) : null}
                  <GlassTableCell className="text-right">
                    <ViewDetailsButton onClick={() => setDetailItem(item)} />
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
        title="Correction details"
        fields={
          detailItem
            ? [
                { label: "User", value: detailItem.user_name || "User" },
                { label: "Email", value: detailItem.user_email },
                {
                  label: "Previous claim",
                  value: previousClaim(detailItem) || "—",
                },
                {
                  label: "Corrected sentence",
                  value: correctedClaim(detailItem) || "—",
                },
                {
                  label: "AI labeled",
                  value: aiLabeled(detailItem),
                },
                {
                  label: "Doctor labeled",
                  value: doctorLabeled(detailItem),
                },
                {
                  label: "Corrected by",
                  value: detailItem.advisor_name || "Doctor",
                },
                {
                  label: "Date & time",
                  value: formatDate(
                    detailItem.reviewed_at || detailItem.created_at,
                  ),
                },
                {
                  label: "Appointment",
                  value: (() => {
                    const status = appointmentByPrediction.get(
                      detailItem.id,
                    )?.status;
                    if (status === "pending") return "Requested";
                    if (status === "confirmed") return "Confirmed";
                    if (status === "declined") return "Declined";
                    return "Not booked";
                  })(),
                },
              ]
            : []
        }
      />

      <GlassModal
        open={Boolean(bookingItem)}
        onOpenChange={(open) => {
          if (!open && !isBooking) {
            setBookingItem(null);
            setBookingNote("");
            setPayerPhone("");
            setSelectedSlotId("");
            setSlots([]);
            setPaymentConfig(null);
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
            {paymentConfig?.enabled ? (
              <div className="space-y-3 rounded-2xl border border-[#ff5c00]/20 bg-[#ff5c00]/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#0f172a]">
                    Pay with EVC Plus
                  </p>
                  <p className="text-sm font-semibold text-[#cc4a00]">
                    ${Number(paymentConfig.amount).toFixed(2)}{" "}
                    {paymentConfig.currency}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-[#64748b]">
                  {paymentConfig.instructions ||
                    "Approve the Hormuud EVC Plus PIN prompt on your phone to finish booking."}
                </p>
                <div className="space-y-2">
                  <GlassLabel htmlFor="payer-phone">EVC Plus number</GlassLabel>
                  <GlassInput
                    id="payer-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={payerPhone}
                    onChange={(event) => setPayerPhone(event.target.value)}
                    placeholder="61xxxxxxx"
                    className="rounded-xl bg-white"
                    required
                  />
                </div>
              </div>
            ) : null}
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
                  setPayerPhone("");
                  setSelectedSlotId("");
                  setSlots([]);
                  setPaymentConfig(null);
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={
                  isBooking ||
                  isLoadingSlots ||
                  !selectedSlotId ||
                  (Boolean(paymentConfig?.enabled) && !payerPhone.trim())
                }
              >
                {isBooking
                  ? paymentConfig?.enabled
                    ? "Waiting for EVC…"
                    : "Sending…"
                  : paymentConfig?.enabled
                    ? `Pay $${Number(paymentConfig.amount).toFixed(2)} & book`
                    : "Book time"}
              </GlassButton>
            </div>
          </form>
        ) : null}
      </GlassModal>

      <PaymentResultModal
        open={Boolean(resultModal)}
        onOpenChange={(open) => {
          if (!open) setResultModal(null);
        }}
        tone={resultModal?.tone ?? "success"}
        title={resultModal?.title ?? ""}
        message={resultModal?.message ?? ""}
      />
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
