"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { SearchChatsDialog } from "@/components/chat/search-chats-dialog";
import { LogoMark } from "@/components/marketing/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getHistory } from "@/lib/history";
import { shortRoleLabel } from "@/lib/roles";
import { resolveAvatarUrl } from "@/lib/settings";
import { getDisplayName, getInitials } from "@/lib/user";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

type SidebarProps = {
  onClose?: () => void;
  onNavigate?: () => void;
};

function NavItem({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-full bg-brand/10 px-3.5 text-[13px] font-semibold text-brand-deep transition-colors duration-200 sm:h-9"
          : "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 text-[13px] font-semibold text-ink transition-colors duration-200 hover:bg-orange-50 sm:h-9"
      }
    >
      <MaterialIcon
        name={icon}
        size={17}
        className={active ? "text-brand" : "text-ink-muted"}
      />
      {label}
    </button>
  );
}

export function Sidebar({ onClose, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const historyRevision = useChatStore((state) => state.historyRevision);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const selectChat = useChatStore((state) => state.selectChat);
  const removeChat = useChatStore((state) => state.removeChat);
  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const isAdvisor = user?.role === "doctor";

  function go(path: string) {
    router.push(path);
    onNavigate?.();
  }

  useEffect(() => {
    let active = true;
    let idleId = 0;
    let timeoutId = 0;

    async function loadHistory() {
      if (!token) {
        if (active) {
          setHistory([]);
          setIsLoadingHistory(false);
        }
        return;
      }

      if (active) {
        setIsLoadingHistory(true);
      }

      try {
        const items = await getHistory(token);
        if (active) {
          setHistory(items);
        }
      } catch {
        if (active) {
          setHistory([]);
        }
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    }

    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? () => {
            idleId = window.requestIdleCallback(() => void loadHistory(), {
              timeout: 1200,
            });
          }
        : () => {
            timeoutId = window.setTimeout(() => void loadHistory(), 300);
          };

    if (!token) {
      setHistory([]);
      setIsLoadingHistory(false);
    } else {
      schedule();
    }

    return () => {
      active = false;
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [token, historyRevision]);

  function handleNewChat() {
    if (isAdvisor) {
      go("/review");
      return;
    }
    startNewChat();
    setSearchOpen(false);
    go("/prediction");
  }

  function handleSelectChat(id: string) {
    selectChat(id);
    go("/prediction");
  }

  function handleChatDeleted(id: string) {
    removeChat(id);
    if (activeChatId === id) {
      go("/prediction");
    }
  }

  function handleLogout() {
    logout();
    toast.success("Signed out successfully.");
    router.replace("/login");
  }

  if (!user || !token) return null;

  const displayName = getDisplayName(user);
  const initials = getInitials(user);
  const avatarSrc = resolveAvatarUrl(user.avatar_url);

  return (
    <>
      <aside className="flex h-full w-full max-w-[280px] shrink-0 flex-col rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.1)] lg:w-[240px]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="min-w-0 cursor-pointer"
            aria-label={isAdvisor ? "SomAI — review" : "SomAI — new chat"}
          >
            <LogoMark className="h-11 sm:h-12" />
          </button>
          <div className="flex items-center gap-0.5">
            {isAdvisor ? null : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
                aria-label="Search chats"
                title="Search chats"
              >
                <MaterialIcon name="search" size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
              aria-label="Close sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftIcon className="size-[18px]" />
            </button>
          </div>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 pt-2">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
            Workspace
          </p>
          <div className="space-y-0.5">
            {isAdvisor ? (
              <NavItem
                icon="fact_check"
                label="Review"
                active={pathname === "/review"}
                onClick={() => go("/review")}
              />
            ) : (
              <NavItem
                icon="dashboard"
                label="Dashboard"
                active={
                  pathname === "/dashboard" || pathname === "/my-dashboard"
                }
                onClick={() =>
                  go(isAdmin ? "/dashboard" : "/my-dashboard")
                }
              />
            )}
            {isAdvisor ? null : (
              <NavItem
                icon="psychology"
                label="Prediction"
                active={pathname === "/prediction"}
                onClick={() => go("/prediction")}
              />
            )}
            <NavItem
              icon="history"
              label="History"
              active={pathname === "/history"}
              onClick={() => go("/history")}
            />
            {!isAdvisor ? (
              <NavItem
                icon="rate_review"
                label="Corrections"
                active={pathname === "/corrections"}
                onClick={() => go("/corrections")}
              />
            ) : (
              <>
                <NavItem
                  icon="schedule"
                  label="Available times"
                  active={pathname === "/availability"}
                  onClick={() => go("/availability")}
                />
                <NavItem
                  icon="event_available"
                  label="Appointments"
                  active={pathname === "/appointments"}
                  onClick={() => go("/appointments")}
                />
              </>
            )}
          </div>

          {isAdmin ? (
            <div className="pt-4">
              <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                Manage
              </p>
              <div className="space-y-0.5">
                <NavItem
                  icon="group"
                  label="Users"
                  active={pathname === "/users"}
                  onClick={() => go("/users")}
                />
                <NavItem
                  icon="medical_services"
                  label="Doctors"
                  active={pathname === "/doctors"}
                  onClick={() => go("/doctors")}
                />
                <NavItem
                  icon="assignment_ind"
                  label="Assign reviews"
                  active={pathname === "/assign-reviews"}
                  onClick={() => go("/assign-reviews")}
                />
                <NavItem
                  icon="download"
                  label="Report"
                  active={pathname === "/report"}
                  onClick={() => go("/report")}
                />
                <NavItem
                  icon="payments"
                  label="Payment attempts"
                  active={pathname === "/payments"}
                  onClick={() => go("/payments")}
                />
                <NavItem
                  icon="policy"
                  label="Audit log"
                  active={pathname === "/audit-log" || pathname === "/activity"}
                  onClick={() => go("/audit-log")}
                />
              </div>
            </div>
          ) : null}

          <div className="pt-4">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              Account
            </p>
            <div className="space-y-0.5">
              <NavItem
                icon="manage_accounts"
                label="Account"
                active={pathname === "/settings" || pathname === "/profile"}
                onClick={() => go("/settings")}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-orange-50"
                aria-label="Account menu"
              >
                <Avatar className="size-8 after:border-0">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-brand text-[11px] font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-ink">
                  {displayName}
                </span>
                <MaterialIcon
                  name="unfold_more"
                  size={18}
                  className="shrink-0 text-ink-muted"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-64 rounded-2xl p-2"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 rounded-xl bg-[#ffefe6] px-3 py-3">
                  <Avatar className="size-9 after:border-0">
                    {avatarSrc ? (
                      <AvatarImage src={avatarSrc} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-brand text-xs font-medium text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={
                      user.role === "doctor"
                        ? "shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800"
                        : "shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-deep"
                    }
                  >
                    {shortRoleLabel(user.role)}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                className="cursor-pointer rounded-lg px-3 py-2"
              >
                <MaterialIcon name="logout" size={16} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <SearchChatsDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        history={history}
        isLoading={isLoadingHistory}
        activeChatId={activeChatId}
        token={token}
        onSelectChat={handleSelectChat}
        onDeleted={handleChatDeleted}
      />
    </>
  );
}
