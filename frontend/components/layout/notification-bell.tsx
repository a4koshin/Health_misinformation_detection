"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { AppNotification } from "@/types/api";

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${hh}:${min}`;
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const previousUnread = useRef<number | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      const data = await listNotifications(token, 20);
      setItems(data.items ?? []);
      const nextUnread = data.unread_count ?? 0;
      if (
        previousUnread.current !== null &&
        nextUnread > previousUnread.current
      ) {
        const newest = (data.items ?? []).find((item) => item.unread);
        toast.info(newest?.title || "You have a new notification.");
      }
      previousUnread.current = nextUnread;
      setUnread(nextUnread);
    } catch {
      // Keep the last known list if polling fails.
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [token]);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) await refresh();
  }

  async function handleClick(item: AppNotification) {
    if (!token) return;
    if (item.unread) {
      try {
        await markNotificationRead(token, item.id);
        setItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? { ...row, unread: false, read_at: new Date().toISOString() }
              : row,
          ),
        );
        setUnread((count) => Math.max(0, count - 1));
      } catch {
        // Navigation still works if mark-read fails.
      }
    }
    setOpen(false);
    router.push(item.href || fallbackHref(user?.role));
  }

  async function handleMarkAll() {
    if (!token || unread === 0) return;
    await markAllNotificationsRead(token);
    setItems((current) =>
      current.map((row) => ({
        ...row,
        unread: false,
        read_at: row.read_at || new Date().toISOString(),
      })),
    );
    setUnread(0);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex size-10 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand",
            className,
          )}
          aria-label={
            unread ? `${unread} unread notifications` : "Notifications"
          }
          title="Notifications"
        >
          <MaterialIcon name="notifications" size={20} />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 font-normal">
          <span className="text-sm font-semibold text-ink">Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="cursor-pointer text-xs font-semibold text-brand hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ink-muted">
            No notifications yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="cursor-pointer items-start gap-2 rounded-xl px-3 py-2.5"
                onClick={() => void handleClick(item)}
              >
                <span
                  className={
                    item.unread
                      ? "mt-1 size-2 shrink-0 rounded-full bg-brand"
                      : "mt-1 size-2 shrink-0 rounded-full bg-gray-200"
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">
                    {item.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    {formatWhen(item.created_at)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function fallbackHref(role: string | undefined) {
  if (role === "doctor") return "/review";
  if (role === "admin") return "/assign-reviews";
  return "/corrections";
}
