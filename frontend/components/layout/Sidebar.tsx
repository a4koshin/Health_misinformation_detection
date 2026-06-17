"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, SquarePen } from "lucide-react";

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

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [history, setHistory] = useState<Detection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[#e5e5e5] bg-[#f9f9f9] text-[#0d0d0d]">
      <div className="flex flex-col gap-1 p-2 pt-3">
        <Link
          href="/chat"
          onClick={() => setActiveId(null)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal transition-colors hover:bg-[#ececec]",
            pathname === "/chat" && !activeId && "bg-[#ececec]",
          )}
        >
          <SquarePen className="size-4 text-[#5d5d5d]" />
          New chat
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
        <p className="px-3 py-2 text-xs font-medium text-[#8e8e8e]">Chats</p>
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[#8e8e8e]">No chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm text-[#0d0d0d] transition-colors hover:bg-[#ececec]",
                      activeId === item.id && "bg-[#ececec]",
                    )}
                  >
                    {truncateText(item.input_text)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-[#e5e5e5] p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#ececec]"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-[#5436da] text-xs text-white">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0d0d0d]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[#6b6b6b]">{user.email}</p>
              </div>
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
