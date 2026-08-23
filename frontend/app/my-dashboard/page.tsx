"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
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
import { TableIconButton } from "@/components/glass/table-icon-button";
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { formatRelativeTime, getConversationTitle } from "@/lib/chat";
import { getHistory, getUserDashboardStats } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection, UserDashboardStats } from "@/types/api";

const COLORS = {
  brand: "#ff5c00",
  reliable: "#059669",
  nonReliable: "#dc2626",
  chats: "#64748b",
  grid: "#e2e8f0",
  text: "#0f172a",
  muted: "#475569",
} as const;

const RADIAN = Math.PI / 180;

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
  if (percent < 0.04) return null;
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

const statCards = [
  {
    key: "total_predictions",
    label: "Total predictions",
    icon: "query_stats",
    tone: "brand",
  },
  {
    key: "reliable_count",
    label: "Reliable",
    icon: "verified",
    tone: "success",
  },
  {
    key: "non_reliable_count",
    label: "Non-Reliable",
    icon: "report",
    tone: "danger",
  },
  {
    key: "chat_count",
    label: "Chats",
    icon: "forum",
    tone: "neutral",
  },
] as const;

const toneStyles = {
  brand: "bg-[#ff5c00]/10 text-[#ff5c00]",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
  neutral: "bg-gray-100 text-[#475569]",
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
  tone: keyof typeof toneStyles;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#475569]">{label}</p>
        <span
          className={`flex size-9 items-center justify-center rounded-xl ${toneStyles[tone]}`}
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

function ChartSkeleton() {
  return (
    <div className="glass animate-pulse rounded-3xl p-6">
      <div className="h-4 w-40 rounded-full bg-gray-50" />
      <div className="mt-6 h-64 rounded-2xl bg-gray-50" />
    </div>
  );
}

function labelTone(label: string | null) {
  if (label === "Reliable") return "success" as const;
  if (label === "Non-Reliable" || label === "Misinformation") {
    return "danger" as const;
  }
  return "neutral" as const;
}

function displayLabel(label: string | null) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
}

function UserDashboardContent() {
  const router = useRouter();
  const { token } = useAuth();
  const selectChat = useChatStore((state) => state.selectChat);
  const historyRevision = useChatStore((state) => state.historyRevision);
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [chats, setChats] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<Detection | null>(null);
  const chatsPagination = useTablePagination(chats, 10);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!token) return;
      setIsLoading(true);
      try {
        const [statsResult, historyResult] = await Promise.allSettled([
          getUserDashboardStats(token),
          getHistory(token),
        ]);

        if (!active) return;

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
        } else {
          setStats({
            total_predictions: 0,
            reliable_count: 0,
            non_reliable_count: 0,
            chat_count: 0,
          });
          const message =
            statsResult.reason instanceof ApiError
              ? statsResult.reason.message
              : "Unable to load dashboard stats.";
          toast.error(message);
        }

        if (historyResult.status === "fulfilled") {
          setChats(
            Array.isArray(historyResult.value) ? historyResult.value : [],
          );
        } else {
          setChats([]);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    const items = [
      {
        name: "Reliable",
        value: stats.reliable_count,
        color: COLORS.reliable,
      },
      {
        name: "Non-Reliable",
        value: stats.non_reliable_count,
        color: COLORS.nonReliable,
      },
    ].filter((item) => item.value > 0);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item) => ({
      ...item,
      percentLabel: total ? `${Math.round((item.value / total) * 100)}%` : "0%",
    }));
  }, [stats]);

  const barData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Total",
        count: stats.total_predictions,
        fill: COLORS.brand,
      },
      {
        name: "Reliable",
        count: stats.reliable_count,
        fill: COLORS.reliable,
      },
      {
        name: "Non-Reliable",
        count: stats.non_reliable_count,
        fill: COLORS.nonReliable,
      },
      {
        name: "Chats",
        count: stats.chat_count,
        fill: COLORS.chats,
      },
    ];
  }, [stats]);

  function handleOpenChat(id: string) {
    selectChat(id);
    router.push("/prediction");
  }

  return (
    <PrivatePage
      title="Dashboard"
      description="Your prediction activity with charts and a list of your chats."
    >
      {isLoading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatSkeleton key={card.key} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      ) : stats ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={stats[card.key]}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Reliable vs Non-Reliable
                </h2>
                <p className="text-sm text-[#475569]">
                  Share of your prediction outcomes.
                </p>
              </div>

              {pieData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                  <MaterialIcon
                    name="pie_chart"
                    size={28}
                    className="text-[#ff8a4d]"
                  />
                  <p className="text-sm text-[#475569]">
                    No prediction outcomes yet.
                  </p>
                </div>
              ) : (
                <div className="h-56 w-full sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                        label={donutPercentLabel}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(_value, name, item) => [
                          item?.payload?.percentLabel ??
                            `${Math.round(Number(item?.percent ?? 0) * 100)}%`,
                          name,
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                        }}
                      />
                      <Legend
                        formatter={(value, entry) =>
                          `${value} (${entry.payload?.percentLabel ?? ""})`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Activity overview
                </h2>
                <p className="text-sm text-[#475569]">
                  Predictions and chats at a glance.
                </p>
              </div>

              <div className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barSize={28} margin={{ top: 18 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={COLORS.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,92,0,0.06)" }}
                      formatter={(value) => [Number(value), "Count"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                      }}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                      {barData.map((entry) => (
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
              </div>
            </GlassCard>
          </div>

          <DataTableCard
            header={
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Your chats
                </h2>
                <p className="text-sm text-[#475569]">
                  Recent conversations and their latest labels.
                </p>
              </div>
            }
            footer={
              chats.length > 0 ? (
                <TablePagination
                  page={chatsPagination.page}
                  totalPages={chatsPagination.totalPages}
                  totalItems={chatsPagination.totalItems}
                  rangeStart={chatsPagination.rangeStart}
                  rangeEnd={chatsPagination.rangeEnd}
                  pageNumbers={chatsPagination.pageNumbers}
                  onPageChange={chatsPagination.setPage}
                  rowsPerPage={chatsPagination.rowsPerPage}
                  onRowsPerPageChange={chatsPagination.setRowsPerPage}
                />
              ) : undefined
            }
          >
            <GlassTableHead>
              <GlassTableRow>
                <GlassTableHeaderCell>Chat</GlassTableHeaderCell>
                <GlassTableHeaderCell>Label</GlassTableHeaderCell>
                <GlassTableHeaderCell>Updated</GlassTableHeaderCell>
                <GlassTableHeaderCell className="text-right">
                  Action
                </GlassTableHeaderCell>
              </GlassTableRow>
            </GlassTableHead>
            <GlassTableBody>
              {chats.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell colSpan={4}>
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                        <MaterialIcon name="forum" size={24} />
                      </span>
                      <p className="text-sm font-medium text-[#0f172a]">
                        No chats yet
                      </p>
                      <p className="text-sm text-[#475569]">
                        Your analyzed health claims will appear here.
                      </p>
                    </div>
                  </GlassTableCell>
                </GlassTableRow>
              ) : (
                chatsPagination.pageItems.map((chat) => (
                  <GlassTableRow key={chat.id}>
                    <GlassTableCell>
                      <p className="max-w-xs truncate font-medium text-[#0f172a]">
                        {getConversationTitle(chat)}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={labelTone(chat.label)}>
                        {displayLabel(chat.label)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="text-[#475569]">
                      {formatRelativeTime(chat.created_at)}
                    </GlassTableCell>
                    <GlassTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ViewDetailsButton
                          onClick={() => setDetailItem(chat)}
                        />
                        <TableIconButton
                          label="Open chat"
                          icon="open_in_new"
                          tone="brand"
                          onClick={() => handleOpenChat(chat.id)}
                        />
                      </div>
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              )}
            </GlassTableBody>
          </DataTableCard>
        </div>
      ) : (
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="monitoring" size={24} />
          </span>
          <p className="text-sm text-[#475569]">No prediction data yet.</p>
        </GlassCard>
      )}

      <ViewDetailsModal
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title="Chat details"
        fields={
          detailItem
            ? [
                {
                  label: "Claim",
                  value: getConversationTitle(detailItem),
                },
                { label: "Label", value: displayLabel(detailItem.label) },
                {
                  label: "Updated",
                  value: formatRelativeTime(detailItem.created_at),
                },
                {
                  label: "Corrected sentence",
                  value: detailItem.corrected_claim_text,
                },
              ]
            : []
        }
      />
    </PrivatePage>
  );
}

export default function UserDashboardPage() {
  return (
    <ProtectedRoute roles={["user", "admin"]}>
      <AppShell>
        <UserDashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}
