"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import { GlassCard } from "@/components/glass/glass-card";
import {
  GlassInput,
  GlassLabel,
  GlassSelect,
} from "@/components/glass/glass-input";
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
import { downloadReportCsv, getUserReport } from "@/lib/history";
import { displayRoleLabel, roleBadgeTone } from "@/lib/roles";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { ReportRow, UserReportResponse, UserRole } from "@/types/api";

const toneStyles = {
  brand: "bg-[#ff5c00]/10 text-[#ff5c00]",
  blue: "bg-blue-500/10 text-blue-700",
  success: "bg-emerald-500/10 text-emerald-700",
  danger: "bg-red-500/10 text-red-700",
} as const;

type LabelFilter = "all" | "Reliable" | "Non-Reliable";
type SourceFilter = "all" | "Manual check" | "UploadedFile";
type PeriodFilter = "all" | "daily" | "weekly" | "monthly" | "yearly";
type RoleFilter = "all" | UserRole;

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function rowDateKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function periodBounds(period: PeriodFilter): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const now = new Date();
  const end = endOfLocalDay(now);
  if (period === "daily") {
    return { start: startOfLocalDay(now), end };
  }
  if (period === "weekly") {
    const weekday = now.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() + mondayOffset);
    return { start, end };
  }
  if (period === "monthly") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end };
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

function displaySource(source: string | null | undefined) {
  return source || "Manual check";
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
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

function ReportContent() {
  const { token } = useAuth();
  const historyRevision = useChatStore((state) => state.historyRevision);
  const [report, setReport] = useState<UserReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReport() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await getUserReport(token, {
          role: roleFilter,
          doctorId: doctorFilter,
        });
        if (active) setReport(data);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load report.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadReport();
    return () => {
      active = false;
    };
  }, [token, historyRevision, roleFilter, doctorFilter]);

  const allRows = report?.rows ?? [];

  const users = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    for (const row of allRows) {
      const id = row.user_id || row.user_email || "";
      if (!id || map.has(id)) continue;
      map.set(id, {
        id,
        name: row.user_name || row.user_email?.split("@")[0] || "User",
        email: row.user_email || "",
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  const hasFilters =
    Boolean(search.trim()) ||
    labelFilter !== "all" ||
    sourceFilter !== "all" ||
    userFilter !== "all" ||
    roleFilter !== "all" ||
    doctorFilter !== "all" ||
    period !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const rowMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const bounds = periodBounds(period);

    return (row: ReportRow, options?: { doctorId?: string }) => {
      const label = displayLabel(row.label);
      if (labelFilter !== "all" && label !== labelFilter) return false;

      const source = displaySource(row.source);
      if (sourceFilter !== "all" && source !== sourceFilter) return false;

      const userId = row.user_id || row.user_email || "";
      if (userFilter !== "all" && userId !== userFilter) return false;

      if (roleFilter === "doctor" && !row.advisor_id) {
        return false;
      }

      const doctorId = options?.doctorId ?? "all";
      if (doctorId !== "all" && row.advisor_id !== doctorId) return false;

      const created = row.created_at ? new Date(row.created_at) : null;
      const createdTime =
        created && !Number.isNaN(created.getTime()) ? created.getTime() : null;

      if (bounds) {
        if (createdTime === null) return false;
        if (
          createdTime < bounds.start.getTime() ||
          createdTime > bounds.end.getTime()
        ) {
          return false;
        }
      } else {
        const dateKey = rowDateKey(row.created_at);
        if (dateFrom && (!dateKey || dateKey < dateFrom)) return false;
        if (dateTo && (!dateKey || dateKey > dateTo)) return false;
      }

      if (!query) return true;

      const haystack = [
        row.claim,
        row.user_name,
        row.user_email,
        row.user_role,
        row.advisor_name,
        label,
        source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    };
  }, [
    search,
    labelFilter,
    sourceFilter,
    userFilter,
    roleFilter,
    period,
    dateFrom,
    dateTo,
  ]);

  const filtered = useMemo(
    () => allRows.filter((row) => rowMatches(row)),
    [allRows, rowMatches],
  );

  const doctorCorrectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      if (!rowMatches(row, { doctorId: "all" })) continue;
      if (row.review_status === "corrected" && row.advisor_id) {
        counts.set(row.advisor_id, (counts.get(row.advisor_id) || 0) + 1);
      }
    }
    return counts;
  }, [allRows, rowMatches]);

  const pagination = useTablePagination(filtered, 10);

  const totalClaims = filtered.length;
  const reliableCount = filtered.filter(
    (row) => displayLabel(row.label) === "Reliable",
  ).length;
  const nonReliableCount = filtered.filter(
    (row) => displayLabel(row.label) === "Non-Reliable",
  ).length;
  const usersWithPredictions = new Set(
    filtered.map((row) => row.user_id || row.user_email).filter(Boolean),
  ).size;
  const doctors = report?.doctors ?? [];
  const doctorsWhoCanReview =
    report?.doctors_who_can_review ?? doctors.length;
  const selectedDoctor = doctors.find((doctor) => doctor.id === doctorFilter);
  const sentencesCorrected = filtered.filter(
    (row) => row.review_status === "corrected" && Boolean(row.advisor_id),
  ).length;

  function clearFilters() {
    setSearch("");
    setLabelFilter("all");
    setSourceFilter("all");
    setUserFilter("all");
    setRoleFilter("all");
    setDoctorFilter("all");
    setPeriod("all");
    setDateFrom("");
    setDateTo("");
  }

  function handleDownload() {
    if (!filtered.length) return;
    setIsDownloading(true);
    try {
      downloadReportCsv(
        roleFilter === "doctor"
          ? filtered.map((row) => ({
              ...row,
              user_role: "doctor",
              user_name: row.advisor_name || "Doctor",
              user_email: row.advisor_email || "",
            }))
          : filtered,
      );
      toast.success(
        hasFilters
          ? "Filtered report downloaded."
          : "Report downloaded.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to download report.";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <PrivatePage
      title="Report"
      description="Platform-wide predictions across all users. Filter the table, then download the matching rows as CSV."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <GlassButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              <MaterialIcon name="filter_alt_off" size={18} />
              Clear filters
            </GlassButton>
          ) : null}
          <GlassButton
            type="button"
            disabled={isLoading || isDownloading || !totalClaims}
            onClick={handleDownload}
            className="bg-brand bg-none hover:bg-[#e65300]"
          >
            <MaterialIcon name="download" size={18} />
            {isDownloading ? "Downloading..." : "Download CSV"}
          </GlassButton>
        </div>
      }
    >
      {isLoading || !report ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass animate-pulse rounded-3xl p-5">
                <div className="h-4 w-24 rounded-full bg-gray-50" />
                <div className="mt-4 h-8 w-16 rounded-lg bg-gray-50" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total claims"
              value={totalClaims}
              icon="description"
              tone="brand"
            />
            <StatCard
              label="Doctors who can review"
              value={doctorsWhoCanReview}
              icon="medical_services"
              tone="blue"
            />
            <StatCard
              label={
                selectedDoctor
                  ? `Sentences ${selectedDoctor.name} corrected`
                  : "Sentences doctors corrected"
              }
              value={sentencesCorrected}
              icon="fact_check"
              tone="success"
            />
            <StatCard
              label="Users with predictions"
              value={usersWithPredictions}
              icon="group"
              tone="blue"
            />
            <StatCard
              label="Reliable"
              value={reliableCount}
              icon="verified_user"
              tone="success"
            />
            <StatCard
              label="Non-Reliable"
              value={nonReliableCount}
              icon="report"
              tone="danger"
            />
          </div>

          <DataTableCard
            header={
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Prediction reports
                </h2>
                <p className="text-sm text-[#475569]">
                  Search and filter every claim checked on the platform.
                </p>
              </div>
            }
            toolbar={
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <GlassLabel>Period</GlassLabel>
                  <div className="flex flex-wrap gap-2">
                    {PERIOD_OPTIONS.map((option) => {
                      const active = period === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setPeriod(option.value);
                            if (option.value !== "all") {
                              setDateFrom("");
                              setDateTo("");
                            }
                          }}
                          className={
                            active
                              ? "h-9 cursor-pointer rounded-full bg-brand/10 px-3.5 text-sm font-semibold text-brand-deep"
                              : "h-9 cursor-pointer rounded-full px-3.5 text-sm font-semibold text-ink hover:bg-orange-50"
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <div className="space-y-1.5 sm:col-span-2 2xl:col-span-2">
                  <GlassLabel htmlFor="report-search">Search</GlassLabel>
                  <div className="relative">
                    <MaterialIcon
                      name="search"
                      size={18}
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
                    />
                    <GlassInput
                      id="report-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search claim, user, or email..."
                      className="rounded-xl bg-white pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <GlassLabel htmlFor="report-role">Role</GlassLabel>
                  <GlassSelect
                    id="report-role"
                    value={roleFilter}
                    onChange={(event) =>
                      setRoleFilter(event.target.value as RoleFilter)
                    }
                    className="rounded-xl bg-white"
                  >
                    <option value="all">All roles</option>
                    <option value="user">User</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </GlassSelect>
                </div>

                <div className="space-y-1.5">
                  <GlassLabel htmlFor="report-doctor">Doctor</GlassLabel>
                  <GlassSelect
                    id="report-doctor"
                    value={doctorFilter}
                    onChange={(event) => setDoctorFilter(event.target.value)}
                    className="rounded-xl bg-white"
                  >
                    <option value="all">All doctors</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} (
                        {doctorCorrectionCounts.get(doctor.id) ?? 0}{" "}
                        corrected)
                      </option>
                    ))}
                  </GlassSelect>
                </div>

                <div className="space-y-1.5">
                  <GlassLabel htmlFor="report-label">Label</GlassLabel>
                  <GlassSelect
                    id="report-label"
                    value={labelFilter}
                    onChange={(event) =>
                      setLabelFilter(event.target.value as LabelFilter)
                    }
                    className="rounded-xl bg-white"
                  >
                    <option value="all">All labels</option>
                    <option value="Reliable">Reliable</option>
                    <option value="Non-Reliable">Non-Reliable</option>
                  </GlassSelect>
                </div>

                <div className="space-y-1.5">
                  <GlassLabel htmlFor="report-source">Source</GlassLabel>
                  <GlassSelect
                    id="report-source"
                    value={sourceFilter}
                    onChange={(event) =>
                      setSourceFilter(event.target.value as SourceFilter)
                    }
                    className="rounded-xl bg-white"
                  >
                    <option value="all">All sources</option>
                    <option value="Manual check">Manual check</option>
                    <option value="UploadedFile">UploadedFile</option>
                  </GlassSelect>
                </div>

                <div className="space-y-1.5">
                  <GlassLabel htmlFor="report-user">User</GlassLabel>
                  <GlassSelect
                    id="report-user"
                    value={userFilter}
                    onChange={(event) => setUserFilter(event.target.value)}
                    className="rounded-xl bg-white"
                  >
                    <option value="all">All users</option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.email ? ` (${item.email})` : ""}
                      </option>
                    ))}
                  </GlassSelect>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <div className="space-y-1.5">
                    <GlassLabel htmlFor="report-from">From</GlassLabel>
                    <GlassInput
                      id="report-from"
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      disabled={period !== "all"}
                      onChange={(event) => {
                        setPeriod("all");
                        setDateFrom(event.target.value);
                      }}
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <GlassLabel htmlFor="report-to">To</GlassLabel>
                    <GlassInput
                      id="report-to"
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      disabled={period !== "all"}
                      onChange={(event) => {
                        setPeriod("all");
                        setDateTo(event.target.value);
                      }}
                      className="rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>
              </div>
            }
            footer={
              filtered.length > 0 ? (
                <TablePagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  rangeStart={pagination.rangeStart}
                  rangeEnd={pagination.rangeEnd}
                  pageNumbers={pagination.pageNumbers}
                  onPageChange={pagination.setPage}
                  rowsPerPage={pagination.rowsPerPage}
                  onRowsPerPageChange={pagination.setRowsPerPage}
                />
              ) : undefined
            }
          >
            <GlassTableHead>
              <GlassTableRow>
                <GlassTableHeaderCell>User</GlassTableHeaderCell>
                <GlassTableHeaderCell>Role</GlassTableHeaderCell>
                <GlassTableHeaderCell>Claim</GlassTableHeaderCell>
                <GlassTableHeaderCell>Label</GlassTableHeaderCell>
                <GlassTableHeaderCell>Reviewed</GlassTableHeaderCell>
                <GlassTableHeaderCell>Source</GlassTableHeaderCell>
                <GlassTableHeaderCell>Date and Time</GlassTableHeaderCell>
              </GlassTableRow>
            </GlassTableHead>
            <GlassTableBody>
              {filtered.length === 0 ? (
                <GlassTableRow>
                  <GlassTableCell colSpan={7}>
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                        <MaterialIcon name="description" size={24} />
                      </span>
                      <p className="text-sm font-medium text-[#0f172a]">
                        {hasFilters ? "No matching reports" : "No reports yet"}
                      </p>
                      <p className="text-sm text-[#475569]">
                        {hasFilters
                          ? "Try a different period, role, doctor, search, or date range."
                          : "Run predictions to build a downloadable report."}
                      </p>
                    </div>
                  </GlassTableCell>
                </GlassTableRow>
              ) : (
                pagination.pageItems.map((row: ReportRow, index) => (
                  <GlassTableRow
                    key={`${row.id ?? row.conversation_id}-${row.created_at}-${index}`}
                  >
                    <GlassTableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0f172a]">
                          {roleFilter === "doctor"
                            ? row.advisor_name || "Doctor"
                            : row.user_name ||
                              row.user_email?.split("@")[0] ||
                              "User"}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {roleFilter === "doctor"
                            ? row.advisor_email || "—"
                            : row.user_email || "—"}
                        </p>
                      </div>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge
                        tone={roleBadgeTone(
                          roleFilter === "doctor"
                            ? "doctor"
                            : row.user_role,
                        )}
                      >
                        {displayRoleLabel(
                          roleFilter === "doctor"
                            ? "doctor"
                            : row.user_role,
                        )}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell>
                      <p className="max-w-md truncate text-[#0f172a]">
                        {row.claim}
                      </p>
                    </GlassTableCell>
                    <GlassTableCell>
                      <GlassBadge tone={labelTone(row.label)}>
                        {displayLabel(row.label)}
                      </GlassBadge>
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {row.review_status === "corrected" && row.advisor_name
                        ? `Reviewed by ${row.advisor_name}`
                        : row.review_status === "pending"
                          ? "Waiting"
                          : "—"}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {displaySource(row.source)}
                    </GlassTableCell>
                    <GlassTableCell className="whitespace-nowrap text-[#475569]">
                      {row.created_at ? formatDateTime(row.created_at) : "—"}
                    </GlassTableCell>
                  </GlassTableRow>
                ))
              )}
            </GlassTableBody>
          </DataTableCard>
        </div>
      )}
    </PrivatePage>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <ReportContent />
      </AppShell>
    </ProtectedRoute>
  );
}
