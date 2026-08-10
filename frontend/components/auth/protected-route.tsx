"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getPrivateHomePath } from "@/lib/auth-routing";
import { useAuth } from "@/store/auth-store";
import type { UserRole } from "@/types/api";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();

  const isAllowed = !!user && (!roles || roles.includes(user.role));

  let redirectTarget: string | null = null;
  if (isInitialized) {
    if (!user) {
      redirectTarget = "/login";
    } else if (!isAllowed) {
      redirectTarget = getPrivateHomePath(user);
    }
  }

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  if (!isInitialized || !user) {
    return (
      <div className="liquid-bg flex min-h-screen items-center justify-center">
        <div
          className="size-6 animate-spin rounded-full border-2 border-[#ff5c00]/20 border-t-[#ff5c00]"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="liquid-bg flex min-h-screen items-center justify-center">
        <div
          className="size-6 animate-spin rounded-full border-2 border-[#ff5c00]/20 border-t-[#ff5c00]"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return children;
}
