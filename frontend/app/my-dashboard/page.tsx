"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import {
  GlassTable,
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
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

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      if (!token) return;
      setIsLoading(true);
      try {
        const [statsData, historyData] = await Promise.all([
          getUserDashboardStats(token),
          getHistory(token),
        ]);
        if (active) {
          setStats(statsData);
          setChats(historyData);
        }
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load your dashboard.";
        toast.error(message);
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
    return [
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatSkeleton key={card.key} />
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="mt-6">
            <ChartSkeleton />
          </div>
        </>
      ) : stats ? (
        <>
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

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-normal text-[#0f172a]">
                    Reliable vs Non-Reliable
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Share of your prediction outcomes
                  </p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
                  <MaterialIcon name="pie_chart" size={20} />
                </span>
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
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}`, "Count"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-normal text-[#0f172a]">
                    Activity overview
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Predictions and chats at a glance
                  </p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
                  <MaterialIcon name="bar_chart" size={20} />
                </span>
              </div>

              <div className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barSize={28}>
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
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-normal text-[#0f172a]">
                  Your chats
                </h2>
                <p className="text-xs text-[#475569]">
                  Recent conversations and their latest labels
                </p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
                <MaterialIcon name="table_rows" size={20} />
              </span>
            </div>

            {chats.length === 0 ? (
              <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                  <MaterialIcon name="forum" size={24} />
                </span>
                <p className="text-sm font-medium text-[#0f172a]">
                  No chats yet
                </p>
                <p className="text-sm text-[#475569]">
                  Your analyzed health claims will appear here.
                </p>
              </GlassCard>
            ) : (
              <GlassTable>
                <GlassTableHead>
                  <GlassTableRow>
                    <GlassTableHeaderCell>Chat</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Label</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Messages</GlassTableHeaderCell>
                    <GlassTableHeaderCell>Updated</GlassTableHeaderCell>
                    <GlassTableHeaderCell className="text-right">
                      Action
                    </GlassTableHeaderCell>
                  </GlassTableRow>
                </GlassTableHead>
                <GlassTableBody>
                  {chats.map((chat) => (
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
                      <GlassTableCell>
                        {chat.message_count ?? "—"}
                      </GlassTableCell>
                      <GlassTableCell className="text-[#475569]">
                        {formatRelativeTime(chat.created_at)}
                      </GlassTableCell>
                      <GlassTableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenChat(chat.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#ff5c00]/10 px-3 py-1.5 text-xs font-medium text-[#cc4a00] transition-colors hover:bg-[#ff5c00]/15"
                        >
                          Open
                          <MaterialIcon name="arrow_forward" size={14} />
                        </button>
                      </GlassTableCell>
                    </GlassTableRow>
                  ))}
                </GlassTableBody>
              </GlassTable>
            )}
          </div>
        </>
      ) : (
        <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="monitoring" size={24} />
          </span>
          <p className="text-sm text-[#475569]">No prediction data yet.</p>
        </GlassCard>
      )}
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
