"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { DataTableCard } from "@/components/glass/data-table-card";
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
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import { listPayments } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { PaymentStatus, PaymentTransaction } from "@/types/api";

type StatusFilter = "all" | PaymentStatus;

function formatDate(value: string | null) {
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

function statusLabel(status: string) {
  if (status === "success") return "Success";
  if (status === "rejected") return "Rejected";
  if (status === "failed") return "Failed";
  return status;
}

function statusTone(status: string) {
  if (status === "success") return "success" as const;
  if (status === "rejected") return "info" as const;
  if (status === "failed") return "danger" as const;
  return "neutral" as const;
}

function formatAmount(item: PaymentTransaction) {
  if (!item.amount) return "—";
  const currency = item.currency || "USD";
  return `${item.amount} ${currency}`;
}

function PaymentsContent() {
  const { token } = useAuth();
  const [items, setItems] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detailItem, setDetailItem] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPayments() {
      if (!token) {
        if (active) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const rows = await listPayments(token);
        if (active) setItems(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (active) {
          setItems([]);
          const message =
            error instanceof ApiError
              ? error.message
              : "Unable to load payments.";
          toast.error(message);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadPayments();
    return () => {
      active = false;
    };
  }, [token]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.status === "success") acc.success += 1;
        else if (item.status === "rejected") acc.rejected += 1;
        else if (item.status === "failed") acc.failed += 1;
        return acc;
      },
      { success: 0, rejected: 0, failed: 0 },
    );
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        item.user_name ?? "",
        item.user_email ?? "",
        item.doctor_name ?? "",
        item.payer_phone ?? "",
        item.payment_reference ?? "",
        item.message ?? "",
        item.status,
        statusLabel(item.status),
        item.amount ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search, statusFilter]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <PrivatePage
      title="Payments"
      description="EVC Plus appointment charges — success, user rejection, and failures."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-[#64748b] uppercase">
            Success
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0f172a]">
            {counts.success}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-[#64748b] uppercase">
            Rejected
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0f172a]">
            {counts.rejected}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-[#64748b] uppercase">
            Failed
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0f172a]">
            {counts.failed}
          </p>
        </div>
      </div>

      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Payment attempts
            </h2>
            <p className="text-sm text-[#475569]">
              Every EVC Plus charge for appointment booking, including declines
              on the phone.
            </p>
          </div>
        }
        toolbar={
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <GlassLabel htmlFor="payment-search">Search</GlassLabel>
              <div className="relative">
                <MaterialIcon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#94a3b8]"
                />
                <GlassInput
                  id="payment-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user, phone, doctor, or reference..."
                  className="rounded-xl bg-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <GlassLabel htmlFor="payment-status">Status</GlassLabel>
              <GlassSelect
                id="payment-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="rounded-xl bg-white"
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </GlassSelect>
            </div>
          </div>
        }
        footer={
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
        }
      >
        <GlassTableHead>
          <GlassTableRow>
            <GlassTableHeaderCell>When</GlassTableHeaderCell>
            <GlassTableHeaderCell>User</GlassTableHeaderCell>
            <GlassTableHeaderCell>Phone</GlassTableHeaderCell>
            <GlassTableHeaderCell>Amount</GlassTableHeaderCell>
            <GlassTableHeaderCell>Status</GlassTableHeaderCell>
            <GlassTableHeaderCell>Details</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              View
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            <GlassTableRow>
              <GlassTableCell
                colSpan={7}
                className="py-12 text-center text-[#64748b]"
              >
                Loading payments…
              </GlassTableCell>
            </GlassTableRow>
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell
                colSpan={7}
                className="py-12 text-center text-[#64748b]"
              >
                No payments match your filters.
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => (
              <GlassTableRow key={item.id}>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {formatDate(item.created_at)}
                </GlassTableCell>
                <GlassTableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0f172a]">
                      {item.user_name || item.user_email || "Unknown"}
                    </p>
                    {item.doctor_name ? (
                      <p className="truncate text-xs text-[#94a3b8]">
                        Dr. {item.doctor_name}
                      </p>
                    ) : null}
                  </div>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {item.payer_phone || "—"}
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#0f172a]">
                  {formatAmount(item)}
                </GlassTableCell>
                <GlassTableCell>
                  <GlassBadge tone={statusTone(item.status)}>
                    {statusLabel(item.status)}
                  </GlassBadge>
                </GlassTableCell>
                <GlassTableCell className="max-w-sm">
                  <p className="line-clamp-2 text-[#475569]">
                    {item.message ||
                      (item.payment_reference
                        ? `Ref ${item.payment_reference}`
                        : "—")}
                  </p>
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <ViewDetailsButton onClick={() => setDetailItem(item)} />
                </GlassTableCell>
              </GlassTableRow>
            ))
          )}
        </GlassTableBody>
      </DataTableCard>

      <ViewDetailsModal
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title="Payment details"
        fields={
          detailItem
            ? [
                { label: "When", value: formatDate(detailItem.created_at) },
                {
                  label: "User",
                  value: detailItem.user_name || detailItem.user_email,
                },
                { label: "Email", value: detailItem.user_email },
                { label: "Doctor", value: detailItem.doctor_name },
                { label: "Phone", value: detailItem.payer_phone },
                { label: "Amount", value: formatAmount(detailItem) },
                { label: "Status", value: statusLabel(detailItem.status) },
                { label: "Method", value: detailItem.payment_method },
                { label: "Reference", value: detailItem.payment_reference },
                { label: "Invoice", value: detailItem.payment_invoice_id },
                { label: "Message", value: detailItem.message },
              ]
            : []
        }
      />
    </PrivatePage>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <PaymentsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
