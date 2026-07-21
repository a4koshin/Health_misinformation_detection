"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getPrivateHomePath } from "@/lib/auth-routing";
import { useAuth } from "@/store/auth-store";

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace(getPrivateHomePath(user));
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || user) {
    return null;
  }

  return children;
}
