"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  Search,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getHistory } from "@/lib/history";
import { getDisplayName, truncateText } from "@/lib/user";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

type SidebarProps = {
  onClose?: () => void;
};

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const selectChat = useChatStore((state) => state.selectChat);
  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
  }, [token]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      item.input_text.toLowerCase().includes(query),
    );
  }, [history, searchQuery]);

  function handleNewChat() {
    startNewChat();
    setIsSearching(false);
    setSearchQuery("");
    router.push("/chat");
  }

  function handleSelectChat(id: string) {
    selectChat(id);
    router.push("/chat");
  }

  function handleLogout() {
    logout();
    toast.success("Signed out successfully.");
    router.replace("/login");
  }

  function handleSearchToggle() {
    setIsSearching((current) => {
      if (current) {
        setSearchQuery("");
      }
      return !current;
    });
  }

  if (!user) return null;

  const displayName = getDisplayName(user);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-[#f8fdfd]">
      <div className="px-2 pt-2">
        <div className="flex items-center justify-between px-1 py-1">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60"
            aria-label="HealthAI home"
          >
            {/* <Sparkles className="size-5" strokeWidth={1.75} /> */}
          </button>

          <div className="flex items-center">
            <button
              type="button"
              onClick={handleSearchToggle}
              className={cn(
                "flex size-9 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60",
                isSearching && "bg-muted/60",
              )}
              aria-label="Search chats"
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {isSearching ? (
          <div className="relative mt-1 px-1 pb-2">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats..."
              className="h-10 rounded-xl border-0 bg-muted/60 pl-10 shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={handleSearchToggle}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close search"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="px-1 pb-2">
            <button
              type="button"
              onClick={handleNewChat}
              className={cn(
                "flex h-10 w-full cursor-pointer items-center gap-3 rounded-2xl bg-muted/60 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted",
                activeChatId === null && "bg-muted",
              )}
            >
              <SquarePen className="size-4 shrink-0" strokeWidth={1.75} />
              New chat
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        {isLoadingHistory ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
        ) : filteredHistory.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            {searchQuery.trim() ? "No matching chats" : "No chats yet"}
          </p>
        ) : (
          <ul className="space-y-0.5 pb-4">
            {filteredHistory.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleSelectChat(item.id)}
                  className={cn(
                    "w-full cursor-pointer truncate rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                    activeChatId === item.id && "bg-muted/50 text-foreground",
                  )}
                >
                  {truncateText(item.input_text, 30)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <span className="truncate text-sm text-foreground">
                {displayName}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
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
    </aside>
  );
}
