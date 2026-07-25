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
          ? "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-full bg-brand/10 px-3.5 text-[13px] font-medium text-brand-deep transition-colors duration-200"
          : "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-full px-3.5 text-[13px] text-ink transition-colors duration-200 hover:bg-orange-50"
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

export function Sidebar({ onClose }: SidebarProps) {
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
  const showChatRecents = pathname === "/chat" || pathname.startsWith("/chat/");

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
    router.push("/chat");
  }

  function handleSelectChat(id: string) {
    selectChat(id);
    router.push("/chat");
  }

  function handleChatDeleted(id: string) {
    removeChat(id);
    if (activeChatId === id) {
      router.push("/chat");
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
      <aside className="flex h-full w-[240px] shrink-0 flex-col rounded-3xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.1)]">
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
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
            aria-label="Close sidebar"
          >
            <MaterialIcon name="left_panel_close" size={18} />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand text-[13px] font-semibold text-white transition-colors hover:bg-[#e65300]"
          >
            <MaterialIcon name="edit_square" size={16} />
            New chat
          </button>
        </div>

        <div className="px-3 pt-2">
          <p className="px-2 pb-1 text-[10px] font-medium tracking-normal text-ink-muted">
            Menu
          </p>
          <div className="space-y-0.5">
            <NavItem
              icon="history"
              label="History"
              active={pathname === "/history"}
              onClick={() => router.push("/history")}
            />
            <NavItem
              icon="search"
              label="Search chats"
              onClick={() => setSearchOpen(true)}
            />
          </div>
        </div>

        {isAdmin ? (
          <div className="px-3 pt-3">
            <p className="px-2 pb-1 text-[10px] font-medium tracking-normal text-ink-muted">
              Admin
            </p>
            <div className="space-y-0.5">
              <NavItem
                icon="dashboard"
                label="Dashboard"
                active={pathname === "/dashboard"}
                onClick={() => router.push("/dashboard")}
              />
              <NavItem
                icon="group"
                label="Users"
                active={pathname === "/users"}
                onClick={() => router.push("/users")}
              />
              <NavItem
                icon="upload_file"
                label="Dataset"
                active={pathname === "/dataset"}
                onClick={() => router.push("/dataset")}
              />
            </div>
          </div>
        ) : null}

        {showChatRecents ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-3">
            <p className="px-2 pb-1 text-[10px] font-medium tracking-normal text-ink-muted">
              Recents
            </p>

            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              {isLoadingHistory ? (
                <p className="px-3 py-1 text-sm text-ink-muted">Loading...</p>
              ) : history.length === 0 ? (
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
        ) : (
          <div className="flex-1" />
        )}

        <div className="border-t border-gray-200 p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-orange-50"
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
                  onClick={() => router.push("/profile")}
                >
                  <MaterialIcon name="person" size={18} />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-3 py-2"
                  onClick={() => router.push("/settings")}
                >
                  <MaterialIcon name="settings" size={18} />
                  Settings
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                className="cursor-pointer rounded-lg px-3 py-2"
              >
                <MaterialIcon name="logout" size={18} />
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
