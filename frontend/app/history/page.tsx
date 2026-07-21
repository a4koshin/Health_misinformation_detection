"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatHistoryItem } from "@/components/chat/chat-history-item";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { getHistory } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

function HistoryContent() {
  const router = useRouter();
  const { token } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const historyRevision = useChatStore((state) => state.historyRevision);
  const selectChat = useChatStore((state) => state.selectChat);
  const removeChat = useChatStore((state) => state.removeChat);
  const [history, setHistory] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!token) {
        if (active) {
          setHistory([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const items = await getHistory(token);
        if (active) setHistory(items);
      } catch {
        if (active) {
          setHistory([]);
          toast.error("Unable to load history.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  function handleSelect(id: string) {
    selectChat(id);
    router.push("/chat");
  }

  function handleDeleted(id: string) {
    removeChat(id);
  }

  return (
    <PrivatePage
      title="History"
      description="Browse and manage your previous health claim conversations."
    >
      <div className="glass-strong rounded-3xl p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <span className="text-3xl text-[#ff8a4d]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-10"
                aria-hidden="true"
              >
                <path
                  d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-[#0f172a]">No chats yet</p>
            <p className="text-sm text-[#475569]">
              Your analyzed health claims will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {history.map((item) => (
              <li key={item.id}>
                <ChatHistoryItem
                  item={item}
                  isActive={activeChatId === item.id}
                  token={token!}
                  variant="search"
                  onSelect={handleSelect}
                  onDeleted={handleDeleted}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrivatePage>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <HistoryContent />
      </AppShell>
    </ProtectedRoute>
  );
}
