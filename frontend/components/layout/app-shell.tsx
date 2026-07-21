"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="liquid-bg flex h-screen w-full gap-3 overflow-hidden p-3">
      <div
        className={cn(
          "h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
          sidebarOpen ? "w-[240px]" : "w-0",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.1)]">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50"
            aria-label="Open sidebar"
          >
            <MaterialIcon name="left_panel_open" size={20} />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
