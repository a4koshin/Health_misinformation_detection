"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassCard } from "@/components/glass/glass-card";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { getDashboardStats } from "@/lib/admin";
import { useAuth } from "@/store/auth-store";
import type { DashboardStats } from "@/types/api";

const COLORS = {
  brand: "#ff5c00",
  reliable: "#059669",
  nonReliable: "#dc2626",
  blue: "#2563eb",
  purple: "#7c3aed",
  orange: "#ea580c",
  green: "#16a34a",
  grid: "#e2e8f0",
  muted: "#475569",
} as const;

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#475569]">{label}</p>
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${tone}`}
        >
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

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`glass animate-pulse rounded-3xl p-6 ${className}`}>
      <div className="h-4 w-40 rounded-full bg-gray-50" />
      <div className="mt-6 h-64 rounded-2xl bg-gray-50" />
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

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Reliable",
        value: stats.reliable_count,
        color: COLORS.reliable,
      },
      {
        name: "Non-Reliable",
        value: stats.non_reliable_count ?? stats.misinformation_count,
        color: COLORS.nonReliable,
      },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const usersPagination = useTablePagination(stats?.users_table ?? [], 10);

  return (
    <PrivatePage
      title="Dashboard"
      description="System-wide prediction activity across every account."
    >
      {isLoading || !stats ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={stats.total_users}
              icon="group"
              tone="bg-[#ff5c00]/10 text-[#ff5c00]"
            />
            <StatCard
              label="Total predictions"
              value={stats.total_predictions ?? stats.total_detections}
              icon="monitoring"
              tone="bg-blue-500/10 text-blue-700"
            />
            <StatCard
              label="Reliable"
              value={stats.reliable_count}
              icon="verified_user"
              tone="bg-emerald-500/10 text-emerald-700"
            />
            <StatCard
              label="Non-Reliable"
              value={stats.non_reliable_count ?? stats.misinformation_count}
              icon="report"
              tone="bg-red-500/10 text-red-700"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-6 lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Reliable vs Non-Reliable
                </h2>
                <p className="text-sm text-[#475569]">
                  Share of labeled predictions across all users.
                </p>
              </div>
              <div className="h-64">
                {pieData.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-[#475569]">
                    No labeled predictions yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#475569]">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-600" />
                  Reliable ({stats.reliable_count})
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-600" />
                  Non-Reliable (
                  {stats.non_reliable_count ?? stats.misinformation_count})
                </span>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Predictions — last 14 days
              </h2>
              <p className="text-sm text-[#475569]">
                Daily volume across all users.
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily ?? []}>
                  <defs>
                    <linearGradient id="predFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.brand}
                    strokeWidth={2}
                    fill="url(#predFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Most active users
              </h2>
              <p className="text-sm text-[#475569]">
                Prediction counts by account.
              </p>
            </div>
            <div className="h-56">
              {(stats.active_users ?? []).length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-[#475569]">
                  No user activity yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.active_users}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: COLORS.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill={COLORS.brand}
                      radius={[0, 8, 8, 0]}
                      barSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <DataTableCard
            header={
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Users &amp; predictions
                </h2>
                <p className="text-sm text-[#475569]">
                  Predictions per account, with Reliable and Non-Reliable totals.
                </p>
              </div>
            }
            footer={
              <TablePagination
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                totalItems={usersPagination.totalItems}
                rangeStart={usersPagination.rangeStart}
                rangeEnd={usersPagination.rangeEnd}
                pageNumbers={usersPagination.pageNumbers}
                onPageChange={usersPagination.setPage}
                rowsPerPage={usersPagination.rowsPerPage}
                onRowsPerPageChange={usersPagination.setRowsPerPage}
              />
            }
          >
            <GlassTableHead>
              <GlassTableRow>
                <GlassTableHeaderCell>User</GlassTableHeaderCell>
                <GlassTableHeaderCell>Role</GlassTableHeaderCell>
                <GlassTableHeaderCell>Predictions</GlassTableHeaderCell>
                <GlassTableHeaderCell>Reliable</GlassTableHeaderCell>
                <GlassTableHeaderCell>Non-Reliable</GlassTableHeaderCell>
                <GlassTableHeaderCell>Joined</GlassTableHeaderCell>
              </GlassTableRow>
            </GlassTableHead>
            <GlassTableBody>
              {usersPagination.pageItems.map((row) => (
                <GlassTableRow key={row.id}>
                  <GlassTableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0f172a]">
                        {row.full_name || row.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        {row.email}
                      </p>
                    </div>
                  </GlassTableCell>
                  <GlassTableCell>
                    <GlassBadge
                      tone={row.role === "admin" ? "brand" : "neutral"}
                      className="capitalize"
                    >
                      {row.role}
                    </GlassBadge>
                  </GlassTableCell>
                  <GlassTableCell>{row.predictions}</GlassTableCell>
                  <GlassTableCell className="text-emerald-700">
                    {row.reliable}
                  </GlassTableCell>
                  <GlassTableCell className="text-red-600">
                    {row.non_reliable}
                  </GlassTableCell>
                  <GlassTableCell className="text-[#64748b]">
                    {row.joined ?? "—"}
                  </GlassTableCell>
                </GlassTableRow>
              ))}
            </GlassTableBody>
          </DataTableCard>
        </div>
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
