import { apiFetch } from "@/lib/api";
import type { Appointment, DoctorAvailability } from "@/types/api";

export async function listAppointments(token: string): Promise<Appointment[]> {
  const data = await apiFetch<{ items?: Appointment[] }>(
    "/api/appointments",
    {},
    token,
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listAvailability(
  token: string,
  doctorUserId?: string,
): Promise<DoctorAvailability[]> {
  const query = doctorUserId
    ? `?doctor_user_id=${encodeURIComponent(doctorUserId)}`
    : "";
  const data = await apiFetch<{ items?: DoctorAvailability[] }>(
    `/api/appointments/availability${query}`,
    {},
    token,
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createAvailability(
  token: string,
  payload: { starts_at: string; ends_at: string },
): Promise<DoctorAvailability> {
  return apiFetch<DoctorAvailability>(
    "/api/appointments/availability",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteAvailability(
  token: string,
  availabilityId: string,
): Promise<void> {
  await apiFetch(
    `/api/appointments/availability/${availabilityId}`,
    { method: "DELETE" },
    token,
  );
}

export async function createAppointment(
  token: string,
  payload: {
    prediction_id: string | number;
    availability_id: string | number;
    note?: string;
  },
): Promise<Appointment> {
  return apiFetch<Appointment>(
    "/api/appointments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateAppointmentStatus(
  token: string,
  appointmentId: string,
  status: "confirmed" | "declined",
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `/api/appointments/${appointmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export function formatSlot(value: string | null | undefined) {
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatSlotDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function slotDateKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function slotDateParts(value: string | null | undefined) {
  if (!value) {
    return { key: "", weekday: "—", day: "—", month: "—", label: "—" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { key: "", weekday: "—", day: "—", month: "—", label: "—" };
  }
  return {
    key: slotDateKey(value),
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()),
    month: MONTHS[date.getMonth()],
    label: formatSlotDate(value),
  };
}

export function formatSlotTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

export function formatSlotRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  if (!startsAt) return "—";
  const date = formatSlotDate(startsAt);
  const start = formatSlotTime(startsAt);
  if (!endsAt) return `${date} · ${start}`;
  return `${date} · ${start} – ${formatSlotTime(endsAt)}`;
}

export function slotDurationLabel(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  if (!startsAt || !endsAt) return "";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours}h ${rest}m`;
  if (hours > 0) return `${hours}h`;
  return `${rest}m`;
}
