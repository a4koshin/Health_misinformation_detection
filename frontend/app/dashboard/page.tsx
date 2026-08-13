"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
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
import { displayRoleLabel, roleBadgeTone } from "@/lib/roles";
import { useAuth } from "@/store/auth-store";
import type { DashboardStats } from "@/types/api";

const COLORS = {
  brand: "#ff5c00",
  reliable: "#059669",
  nonReliable: "#dc2626",
  blue: "#2563eb",
  slate: "#64748b",
  pending: "#d97706",
  confirmed: "#2563eb",
  corrected: "#7c3aed",
  none: "#94a3b8",
  user: "#ff5c00",
  doctor: "#2563eb",
  admin: "#0f172a",
  uploaded: "#ea580c",
  manual: "#0d9488",
  grid: "#e2e8f0",
  muted: "#475569",
} as const;

const RADIAN = Math.PI / 180;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

function donutPercentLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

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

function ChartEmpty({ message }: { message: string }) {
  return (
    <p className="flex h-full items-center justify-center text-sm text-[#475569]">
      {message}
    </p>
  );
}

function ChartLegend({
  items,
}: {
  items: { name: string; color: string; value?: string }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#475569]">
      {items.map((entry) => (
        <span key={entry.name} className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}
          {entry.value ? ` (${entry.value})` : ""}
        </span>
      ))}
    </div>
  );
}

function withPercents(
  items: { name: string; value: number; color: string }[],
) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map((item) => ({
    ...item,
    percentLabel: total ? `${Math.round((item.value / total) * 100)}%` : "0%",
  }));
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
    return withPercents(
      [
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
      ].filter((item) => item.value > 0),
    );
  }, [stats]);

  const roleData = useMemo(() => {
    if (!stats) return [];
    const roleColor: Record<string, string> = {
      user: COLORS.user,
      doctor: COLORS.doctor,
      admin: COLORS.admin,
    };
    const items = (stats.roles ?? []).map((role) => ({
      name: role.name,
      value: role.count,
      color: roleColor[role.key] ?? COLORS.slate,
    }));
    return withPercents(items.filter((item) => item.value > 0));
  }, [stats]);

  const sourceData = useMemo(() => {
    if (!stats) return [];
    const sourceColor: Record<string, string> = {
      UploadedFile: COLORS.uploaded,
      "Manual check": COLORS.manual,
    };
    return withPercents(
      (stats.sources ?? [])
        .map((source) => ({
          name: source.name,
          value: source.count,
          color: sourceColor[source.name] ?? COLORS.slate,
        }))
        .filter((item) => item.value > 0),
    );
  }, [stats]);

  const reviewData = useMemo(() => {
    if (!stats) return [];
    const reviewColor: Record<string, string> = {
      awaiting_assignment: COLORS.pending,
      pending: COLORS.blue,
      confirmed: COLORS.confirmed,
      corrected: COLORS.corrected,
      none: COLORS.none,
    };
    return (stats.reviews ?? [])
      .map((review) => ({
        name: review.name,
        count: review.count,
        fill: reviewColor[review.key] ?? COLORS.slate,
      }))
      .filter((item) => item.count > 0);
  }, [stats]);

  const usersPagination = useTablePagination(stats?.users_table ?? [], 10);

  return (
    <PrivatePage
      title="Dashboard"
      description="System-wide prediction activity, review workload, and account mix."
    >
      {isLoading || !stats ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard
              label="Total users"
              value={stats.total_users}
              icon="group"
              tone="bg-[#ff5c00]/10 text-[#ff5c00]"
            />
            <StatCard
              label="Doctors"
              value={stats.total_advisors ?? 0}
              icon="medical_services"
              tone="bg-blue-500/10 text-blue-700"
            />
            <StatCard
              label="Total predictions"
              value={stats.total_predictions ?? stats.total_detections}
              icon="monitoring"
              tone="bg-slate-500/10 text-slate-700"
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
            <StatCard
              label="Pending reviews"
              value={stats.review_pending_count ?? 0}
              icon="pending_actions"
              tone="bg-amber-500/10 text-amber-700"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Reliable vs Non-Reliable
                </h2>
                <p className="text-sm text-[#475569]">
                  Share of labeled predictions.
                </p>
              </div>
              <div className="h-56">
                {pieData.length === 0 ? (
                  <ChartEmpty message="No labeled predictions yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        label={donutPercentLabel}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(_value, name, item) => [
                          item?.payload?.percentLabel ??
                            `${Math.round(Number(item?.percent ?? 0) * 100)}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <ChartLegend
                items={pieData.map((entry) => ({
                  name: entry.name,
                  color: entry.color,
                  value: entry.percentLabel,
                }))}
              />
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Accounts by role
                </h2>
                <p className="text-sm text-[#475569]">
                  User, Doctor, and Admin mix.
                </p>
              </div>
              <div className="h-56">
                {roleData.length === 0 ? (
                  <ChartEmpty message="No accounts yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        label={donutPercentLabel}
                        labelLine={false}
                      >
                        {roleData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(_value, name, item) => [
                          item?.payload?.percentLabel ??
                            `${Math.round(Number(item?.percent ?? 0) * 100)}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <ChartLegend
                items={roleData.map((entry) => ({
                  name: entry.name,
                  color: entry.color,
                  value: entry.percentLabel,
                }))}
              />
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Prediction sources
                </h2>
                <p className="text-sm text-[#475569]">
                  Manual checks vs uploaded datasets.
                </p>
              </div>
              <div className="h-56">
                {sourceData.length === 0 ? (
                  <ChartEmpty message="No prediction sources yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                        label={donutPercentLabel}
                        labelLine={false}
                      >
                        {sourceData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(_value, name, item) => [
                          item?.payload?.percentLabel ??
                            `${Math.round(Number(item?.percent ?? 0) * 100)}%`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <ChartLegend
                items={sourceData.map((entry) => ({
                  name: entry.name,
                  color: entry.color,
                  value: entry.percentLabel,
                }))}
              />
            </GlassCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Predictions — last 14 days
                </h2>
                <p className="text-sm text-[#475569]">
                  Daily Reliable and Non-Reliable volume.
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.daily ?? []}>
                    <defs>
                      <linearGradient
                        id="reliableFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={COLORS.reliable}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor={COLORS.reliable}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="nonReliableFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={COLORS.nonReliable}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={COLORS.nonReliable}
                          stopOpacity={0.02}
                        />
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
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        Number(value),
                        name === "reliable" ? "Reliable" : "Non-Reliable",
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="reliable"
                      name="Reliable"
                      stroke={COLORS.reliable}
                      strokeWidth={2}
                      fill="url(#reliableFill)"
                      stackId="labels"
                    />
                    <Area
                      type="monotone"
                      dataKey="non_reliable"
                      name="Non-Reliable"
                      stroke={COLORS.nonReliable}
                      strokeWidth={2}
                      fill="url(#nonReliableFill)"
                      stackId="labels"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Doctor review pipeline
                </h2>
                <p className="text-sm text-[#475569]">
                  Pending, confirmed, corrected, and unreviewed claims.
                </p>
              </div>
              <div className="h-72">
                {reviewData.length === 0 ? (
                  <ChartEmpty message="No review activity yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reviewData} margin={{ top: 18, right: 8 }}>
                      <CartesianGrid stroke={COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: COLORS.muted, fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: COLORS.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [Number(value), "Claims"]}
                      />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={36}>
                        {reviewData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="count"
                          position="top"
                          fill="#0f172a"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Most active users
                </h2>
                <p className="text-sm text-[#475569]">
                  Prediction counts by account.
                </p>
              </div>
              <div className="h-64">
                {(stats.active_users ?? []).length === 0 ? (
                  <ChartEmpty message="No user activity yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.active_users}
                      layout="vertical"
                      margin={{ left: 8, right: 32 }}
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
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [Number(value), "Predictions"]}
                      />
                      <Bar
                        dataKey="count"
                        fill={COLORS.brand}
                        radius={[0, 8, 8, 0]}
                        barSize={22}
                      >
                        <LabelList
                          dataKey="count"
                          position="right"
                          fill="#0f172a"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Label mix by user
                </h2>
                <p className="text-sm text-[#475569]">
                  Reliable vs Non-Reliable for top accounts.
                </p>
              </div>
              <div className="h-64">
                {(stats.label_mix ?? []).length === 0 ? (
                  <ChartEmpty message="No labeled user activity yet." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.label_mix}
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
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => [
                          Number(value),
                          name === "reliable" ? "Reliable" : "Non-Reliable",
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="reliable"
                        name="Reliable"
                        stackId="mix"
                        fill={COLORS.reliable}
                        radius={[0, 0, 0, 0]}
                        barSize={22}
                      />
                      <Bar
                        dataKey="non_reliable"
                        name="Non-Reliable"
                        stackId="mix"
                        fill={COLORS.nonReliable}
                        radius={[0, 8, 8, 0]}
                        barSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </div>

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
                    <GlassBadge tone={roleBadgeTone(row.role)}>
                      {displayRoleLabel(row.role)}
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
