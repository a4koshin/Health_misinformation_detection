"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DataTableCard } from "@/components/glass/data-table-card";
import { GlassInput, GlassLabel } from "@/components/glass/glass-input";
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
import { getHistory } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function previousClaim(item: Detection) {
  return (item.original_claim_text || item.claim_text || item.input_text || "").trim();
}

function correctedClaim(item: Detection) {
  const rewritten = (item.corrected_claim_text || "").trim();
  if (rewritten) return rewritten;
  if (item.review_status === "corrected") {
    return (item.advisor_note || "").trim();
  }
  return "";
}

function isAdvisorCorrection(item: Detection) {
  return (
    item.review_status === "corrected" || Boolean((item.corrected_claim_text || "").trim())
  );
}

function CorrectionsContent() {
  const { token } = useAuth();
  const historyRevision = useChatStore((state) => state.historyRevision);
  const [items, setItems] = useState<Detection[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setItems([]);
          setPendingCount(0);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const history = await getHistory(token);
        const rows = Array.isArray(history) ? history : [];
        const corrections = rows.filter(
          (item) => isAdvisorCorrection(item) && Boolean(correctedClaim(item)),
        );
        const pending = rows.filter(
          (item) =>
            item.review_status === "pending" ||
            (item.needs_review && !item.review_status),
        ).length;
        if (active) {
          setItems(corrections);
          setPendingCount(pending);
        }
      } catch {
        if (active) {
          setItems([]);
          setPendingCount(0);
          toast.error("Unable to load corrections.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token, historyRevision]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        previousClaim(item),
        correctedClaim(item),
        item.advisor_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <PrivatePage
      title="Advisor corrections"
      description="Your original claims next to the Healthcare Advisor rewrite and who corrected them."
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Corrected sentences
            </h2>
            <p className="text-sm text-[#475569]">
              Only claims a Healthcare Advisor corrected appear here.
            </p>
          </div>
        }
        toolbar={
          <div className="space-y-1.5">
            <GlassLabel htmlFor="corrections-search">Search</GlassLabel>
            <div className="relative">
              <MaterialIcon
                name="search"
                size={18}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
              />
              <GlassInput
                id="corrections-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search original claim, correction, or advisor…"
                className="rounded-xl bg-white pl-10"
              />
            </div>
          </div>
        }
        footer={
          !isLoading && filtered.length > 0 ? (
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
            <GlassTableHeaderCell>Previous claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected sentence</GlassTableHeaderCell>
            <GlassTableHeaderCell>Corrected by</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date and Time</GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={4}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={4}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="rate_review" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No corrections yet
                  </p>
                  <p className="text-sm text-[#475569]">
                    {pendingCount > 0
                      ? `${pendingCount} Non-Reliable claim${pendingCount === 1 ? "" : "s"} still waiting in the advisor Review queue. After the advisor submits a rewrite, it will appear here.`
                      : "When a Healthcare Advisor rewrites one of your Non-Reliable claims, it will show up here."}
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => (
              <GlassTableRow key={item.id}>
                <GlassTableCell className="max-w-[320px]">
                  <p className="line-clamp-4 text-sm text-[#0f172a]">
                    {previousClaim(item) || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="max-w-[320px]">
                  <p className="line-clamp-4 text-sm font-medium text-[#0f172a]">
                    {correctedClaim(item) || "—"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap">
                  <p className="font-medium text-[#0f172a]">
                    {item.advisor_name || "Healthcare Advisor"}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {formatDate(item.reviewed_at || item.created_at)}
                </GlassTableCell>
              </GlassTableRow>
            ))
          )}
        </GlassTableBody>
      </DataTableCard>
    </PrivatePage>
  );
}

export default function CorrectionsPage() {
  return (
    <ProtectedRoute roles={["user", "admin"]}>
      <AppShell>
        <CorrectionsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
