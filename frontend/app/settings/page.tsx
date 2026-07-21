"use client";

import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassButton } from "@/components/glass/glass-button";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";

function SettingsContent() {
  return (
    <PrivatePage
      title="Settings"
      description="Manage application preferences for your account."
    >
      <div className="glass-strong max-w-xl space-y-4 rounded-3xl p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#0f172a]">
              Email notifications
            </p>
            <p className="text-sm text-[#475569]">
              Get updates when important account changes happen.
            </p>
          </div>
          <GlassButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.success("Notification preference saved.")}
          >
            Enable
          </GlassButton>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#0f172a]">Compact sidebar</p>
            <p className="text-sm text-[#475569]">
              Keep the current glass sidebar and chat layout unchanged.
            </p>
          </div>
          <GlassButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.success("Preference saved.")}
          >
            Keep current
          </GlassButton>
        </div>
      </div>
    </PrivatePage>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
