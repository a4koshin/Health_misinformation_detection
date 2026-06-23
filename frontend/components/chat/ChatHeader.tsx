"use client";

import { ChevronDown } from "lucide-react";

export function ChatHeader() {
  return (
    <header className="flex h-[52px] shrink-0 items-center border-b border-gray-100 bg-white px-4">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-800 transition-all hover:bg-gray-100"
      >
        Health AI
        <ChevronDown className="size-4 text-gray-400" />
      </button>
    </header>
  );
}
