import { apiFetch, API_BASE } from "@/lib/api";
import type { AppNotification, NotificationListResponse } from "@/types/api";

const STREAM_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BACKEND_URL) ||
  "http://127.0.0.1:5000";

/** Direct backend URL so SSE is not buffered by the Next.js rewrite proxy. */
export function notificationStreamUrl(token: string): string {
  const base = (API_BASE || STREAM_BASE).replace(/\/$/, "");
  return `${base}/api/notifications/stream?token=${encodeURIComponent(token)}`;
}

export async function listNotifications(
  token: string,
  limit = 40,
): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>(
    `/api/notifications?limit=${limit}`,
    {},
    token,
  );
}

export async function getUnreadCount(
  token: string,
): Promise<number> {
  const data = await apiFetch<{ unread_count: number }>(
    "/api/notifications/unread-count",
    {},
    token,
  );
  return data.unread_count ?? 0;
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<AppNotification> {
  return apiFetch<AppNotification>(
    `/api/notifications/${id}/read`,
    { method: "POST" },
    token,
  );
}

export async function markAllNotificationsRead(
  token: string,
): Promise<void> {
  await apiFetch("/api/notifications/read-all", { method: "POST" }, token);
}
