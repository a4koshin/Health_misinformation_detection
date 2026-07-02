"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/store/auth-store";

export default function HomePage() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    router.replace(user ? "/chat" : "/login");
  }, [isInitialized, user, router]);

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
