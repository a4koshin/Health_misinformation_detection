"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassCard } from "@/components/glass/glass-card";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";

function ModelsContent() {
  return (
    <PrivatePage
      title="Models"
      description="SomBERTb and gatekeeper model status for the prediction pipeline."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
              <MaterialIcon name="model_training" size={22} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Gatekeeper
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                TF-IDF + LinearSVC medical vs non-medical filter.
              </p>
              <p className="mt-3 text-xs font-medium text-emerald-700">
                Loaded from ml_models/
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700">
              <MaterialIcon name="psychology" size={22} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">SomBERTb</h2>
              <p className="mt-1 text-sm text-[#475569]">
                Task A reliability classifier. Categories use keyword matching
                (no Task B).
              </p>
              <p className="mt-3 text-xs font-medium text-emerald-700">
                best_model_task_a
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </PrivatePage>
  );
}

export default function ModelsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <ModelsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
