"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/auth-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return children;
}
