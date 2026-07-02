"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/store/auth-store";

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace("/chat");
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || user) {
    return null;
  }

  return children;
}
