"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  LogOut,
  MessageSquarePlus,
  Search,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/store/auth-store";
import { getHistory } from "@/lib/history";
import { getDisplayName, getInitials, truncateText } from "@/lib/user";
import type { Detection } from "@/types/api";
import { cn } from "@/lib/utils";

function SidebarItem({
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200/80",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [history, setHistory] = useState<Detection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const items = await getHistory();
        setHistory(items);
      } catch {
        setHistory([]);
      }
    }

    void loadHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return history;
    }
    return history.filter((item) =>
      item.input_text.toLowerCase().includes(query),
    );
  }, [history, searchQuery]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-[#f9f9f9]">
      <div className="flex flex-col gap-1 p-2">
        <Link
          href="/chat"
          onClick={() => setActiveId(null)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-800 transition-colors hover:bg-gray-200/80",
            pathname === "/chat" && !activeId && "bg-gray-200/80",
          )}
        >
          <MessageSquarePlus className="size-4 shrink-0" />
          New chat
        </Link>

        {isSearching ? (
          <div className="px-1">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <Search className="size-4 shrink-0 text-gray-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onBlur={() => {
                  if (!searchQuery.trim()) {
                    setIsSearching(false);
                  }
                }}
                placeholder="Search chats..."
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : (
          <SidebarItem onClick={() => setIsSearching(true)}>
            <Search className="size-4 shrink-0" />
            Search chats
          </SidebarItem>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
        <p className="px-3 py-2 text-xs font-medium text-gray-500">Chats</p>
        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              {searchQuery.trim() ? "No matching chats" : "No chats yet"}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredHistory.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "w-full truncate rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200/80",
                      activeId === item.id && "bg-gray-200/80",
                    )}
                  >
                    {truncateText(item.input_text, 28)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-200/80"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-gray-800 text-xs text-white">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {displayName}
                </p>
              </div>
              <ChevronDown className="size-4 shrink-0 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
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
