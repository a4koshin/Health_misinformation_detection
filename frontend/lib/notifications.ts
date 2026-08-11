import { apiFetch } from "@/lib/api";
import type { AppNotification, NotificationListResponse } from "@/types/api";

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
