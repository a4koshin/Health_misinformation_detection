"use client";

import { useEffect, useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

const LG_QUERY = "(min-width: 1024px)";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(LG_QUERY);
    function sync() {
      const desktop = media.matches;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function closeSidebar() {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }

  return (
    <div
      className={cn(
        "liquid-bg flex h-dvh w-full overflow-hidden",
        "gap-0 p-0 sm:gap-2 sm:p-2 lg:gap-3 lg:p-3",
      )}
    >
      {sidebarOpen && !isDesktop ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "z-50 h-full shrink-0 overflow-hidden transition-transform duration-200 ease-out",
          isDesktop
            ? cn(
                "relative transition-[width] duration-200",
                sidebarOpen ? "w-[240px]" : "w-0",
              )
            : cn(
                "fixed inset-y-0 left-0 w-[min(100%,280px)] p-2 sm:p-3",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
              ),
        )}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          onNavigate={closeSidebar}
        />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-white shadow-none sm:rounded-3xl sm:border sm:border-gray-200 sm:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.1)]">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-20 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink-muted shadow-sm ring-1 ring-gray-200/80 transition-colors hover:bg-orange-50 hover:text-brand"
            aria-label="Open sidebar"
          >
            <MaterialIcon name="menu" size={22} />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
