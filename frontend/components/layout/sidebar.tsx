"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ChatHistoryItem } from "@/components/chat/chat-history-item";
import { SearchChatsDialog } from "@/components/chat/search-chats-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
          ? "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-full bg-brand/10 px-3.5 text-[13px] font-medium text-brand-deep transition-colors duration-200 sm:h-9"
          : "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 text-[13px] text-ink transition-colors duration-200 hover:bg-orange-50 sm:h-9"
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
  const showChatRecents =
    pathname === "/prediction" || pathname.startsWith("/prediction/");

  function go(path: string) {
    router.push(path);
    onNavigate?.();
  }

  useEffect(() => {
    let active = true;

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

    void loadHistory();

    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  function handleNewChat() {
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

  return (
    <>
      <aside className="flex h-full w-full max-w-[280px] shrink-0 flex-col rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.1)] lg:w-[240px]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex cursor-pointer items-center text-[15px] font-extrabold tracking-tight"
          >
            <span className="text-ink">Health</span>
            <span className="text-brand">AI</span>
            <span
              className="mt-2.5 ml-0.5 size-1 rounded-full bg-brand"
              aria-hidden="true"
            />
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
              aria-label="Search chats"
              title="Search chats"
            >
              <MaterialIcon name="search" size={20} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
              aria-label="Close sidebar"
              title="Collapse sidebar"
            >
              <MaterialIcon name="left_panel_close" size={18} />
            </button>
          </div>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 pt-2">
          <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
            Workspace
          </p>
          <div className="space-y-0.5">
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
            <NavItem
              icon="psychology"
              label="Prediction"
              active={pathname === "/prediction"}
              onClick={() => go("/prediction")}
            />
            <NavItem
              icon="history"
              label="History"
              active={pathname === "/history"}
              onClick={() => go("/history")}
            />
            <NavItem
              icon="download"
              label="Report"
              active={pathname === "/report"}
              onClick={() => go("/report")}
            />
          </div>

          {isAdmin ? (
            <div className="pt-4">
              <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
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
                  icon="model_training"
                  label="Models"
                  active={pathname === "/models" || pathname === "/dataset"}
                  onClick={() => go("/models")}
                />
                <NavItem
                  icon="policy"
                  label="Audit log"
                  active={pathname === "/audit-log"}
                  onClick={() => go("/audit-log")}
                />
              </div>
            </div>
          ) : null}

          <div className="pt-4">
            <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
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

          {showChatRecents ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
              <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
                Recents
              </p>

              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-4">
                {isLoadingHistory ? (
                  <p className="px-3 py-1 text-sm text-ink-muted">Loading...</p>
                ) : !Array.isArray(history) || history.length === 0 ? (
                  <p className="px-3 py-1 text-sm text-ink-muted">No chats yet</p>
                ) : (
                  <ul className="space-y-0.5">
                    {history.map((item) => (
                      <li key={item.id}>
                        <ChatHistoryItem
                          item={item}
                          isActive={activeChatId === item.id}
                          token={token}
                          onSelect={handleSelectChat}
                          onDeleted={handleChatDeleted}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 transition-colors hover:bg-orange-50"
                aria-label="Account menu"
              >
                <Avatar size="sm" className="after:border-0">
                  <AvatarFallback className="bg-brand text-[11px] font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-left text-[13px] text-ink">
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
                  <Avatar size="sm" className="after:border-0">
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
                  <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-deep capitalize">
                    {user.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <div className="py-1">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-3 py-2"
                  onClick={() => go("/settings")}
                >
                  <MaterialIcon name="manage_accounts" size={18} />
                  Account
                </DropdownMenuItem>
              </div>
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
