"use client";

import { useEffect, useMemo, useState } from "react";

import { ChatHistoryItem } from "@/components/chat/chat-history-item";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import type { Detection } from "@/types/api";

type SearchChatsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: Detection[];
  isLoading: boolean;
  activeChatId: string | null;
  token: string;
  onSelectChat: (id: string) => void;
  onDeleted: (id: string) => void;
};

export function SearchChatsDialog({
  open,
  onOpenChange,
  history,
  isLoading,
  activeChatId,
  token,
  onSelectChat,
  onDeleted,
}: SearchChatsDialogProps) {
  const [query, setQuery] = useState("");

  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return history;
    return history.filter((item) =>
      item.input_text.toLowerCase().includes(normalized),
    );
  }, [history, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  function handleSelect(id: string) {
    onSelectChat(id);
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] ring-1 ring-[#e3e3e3]">
        <div className="relative border-b border-[#e3e3e3] px-4 py-3">
          <MaterialIcon
            name="search"
            size={22}
            className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-[#444746]"
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats..."
            className="h-11 rounded-xl border-0 bg-[#FFFFFF] pl-10 pr-10 shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-1/2 right-7 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#e9eef6]"
            aria-label="Close search"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </div>

        <div className="max-h-[min(420px,50vh)] overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-3 py-4 text-sm text-[#444746]">Loading chats...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[#444746]">
              {query.trim() ? "No matching chats found." : "No chats yet."}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredHistory.map((item) => (
                <li key={item.id}>
                  <ChatHistoryItem
                    item={item}
                    isActive={activeChatId === item.id}
                    token={token}
                    variant="search"
                    onSelect={handleSelect}
                    onDeleted={onDeleted}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
