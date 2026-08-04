"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { PredictionWorkspace } from "@/components/prediction/prediction-workspace";

export default function PredictionPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <PredictionWorkspace />
      </AppShell>
    </ProtectedRoute>
  );
}
