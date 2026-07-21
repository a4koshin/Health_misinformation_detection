"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassCard } from "@/components/glass/glass-card";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { getDashboardStats } from "@/lib/admin";
import { useAuth } from "@/store/auth-store";
import type { DashboardStats } from "@/types/api";

const statCards = [
  { key: "total_users", label: "Total users", icon: "group" },
  { key: "total_admins", label: "Administrators", icon: "admin_panel_settings" },
  { key: "total_detections", label: "Detections", icon: "query_stats" },
  { key: "reliable_count", label: "Reliable", icon: "verified" },
  { key: "misinformation_count", label: "Misinformation", icon: "report" },
  { key: "pending_count", label: "Pending labels", icon: "pending" },
] as const;

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#475569]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
          <MaterialIcon name={icon} size={20} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-normal tracking-tight text-[#0f172a]">
        {value}
      </p>
    </GlassCard>
  );
}

function StatSkeleton() {
  return (
    <div className="glass animate-pulse rounded-3xl p-5">
      <div className="h-4 w-24 rounded-full bg-gray-50" />
      <div className="mt-4 h-8 w-16 rounded-lg bg-gray-50" />
    </div>
  );
}

function DashboardContent() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await getDashboardStats(token);
        if (active) setStats(data);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load dashboard stats.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <PrivatePage
      title="Dashboard"
      description="Overview of users and detection activity."
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => (
            <StatSkeleton key={card.key} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={card.icon}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="monitoring" size={24} />
          </span>
          <p className="text-sm text-[#475569]">No dashboard data available.</p>
        </GlassCard>
      )}
    </PrivatePage>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}
