"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FDFCFC]">
      <div
        className={cn(
          "h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
          sidebarOpen ? "w-[288px]" : "w-0",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#FDFCFC]">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#f0f4f9]"
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
