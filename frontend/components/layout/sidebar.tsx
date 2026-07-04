"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  PanelLeftClose,
  Search,
  Settings,
  SquarePen,
} from "lucide-react";
import { toast } from "sonner";

import { ChatHistoryItem } from "@/components/chat/chat-history-item";
import { SearchChatsDialog } from "@/components/chat/search-chats-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-full px-4 text-sm text-[#1f1f1f] transition-colors hover:bg-[#e9eef6]"
    >
      <Icon className="size-[18px] shrink-0 text-[#444746]" strokeWidth={1.75} />
      {label}
    </button>
  );
}

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const historyRevision = useChatStore((state) => state.historyRevision);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const selectChat = useChatStore((state) => state.selectChat);
  const removeChat = useChatStore((state) => state.removeChat);
  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

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
      <aside className="flex h-full w-[288px] shrink-0 flex-col bg-[#f8f9fa]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="cursor-pointer text-[15px] font-medium text-[#1f1f1f]"
          >
            HealthAI
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#e9eef6]"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-0.5 px-3 py-2">
          <NavItem icon={SquarePen} label="New chat" onClick={handleNewChat} />
          <NavItem
            icon={Search}
            label="Search chats"
            onClick={() => setSearchOpen(true)}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pt-4">
          <p className="px-2 pb-2 text-xs font-medium text-[#444746]">Recents</p>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {isLoadingHistory ? (
              <p className="px-3 py-1 text-sm text-[#444746]">Loading...</p>
            ) : history.length === 0 ? (
              <p className="px-3 py-1 text-sm text-[#444746]">No chats yet</p>
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

        <div className="border-t border-[#e3e3e3] p-3">
          <div className="flex items-center gap-2 rounded-full px-2 py-1.5">
            <Avatar size="sm" className="after:border-0">
              <AvatarFallback className="bg-[#1a73e8] text-xs font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-sm text-[#1f1f1f]">
              {displayName}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#e9eef6]"
                  aria-label="Settings"
                >
                  <Settings className="size-[18px]" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleLogout}
                  className="cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
