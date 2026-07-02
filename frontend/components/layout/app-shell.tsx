"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#ffffff]">
      <div
        className={cn(
          "h-full shrink-0 overflow-hidden border-r border-border/60 bg-[#fdfefe] transition-[width] duration-200 ease-out",
          sidebarOpen ? "w-[260px]" : "w-0 border-r-0",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/60"
            aria-label="Open sidebar"
          >
            <PanelLeft className="size-5" strokeWidth={1.75} />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
