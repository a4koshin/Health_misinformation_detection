"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ffffff]">
        <div
          className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return children;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthInitializer>{children}</AuthInitializer>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
