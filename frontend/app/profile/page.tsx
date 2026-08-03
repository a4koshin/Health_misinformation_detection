"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";

function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-[#64748b]">
      Redirecting to Account…
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileRedirect />
      </AppShell>
    </ProtectedRoute>
  );
}
