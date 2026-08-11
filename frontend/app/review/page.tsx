"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassLabel,
  GlassTextarea,
} from "@/components/glass/glass-input";
import { GlassModal } from "@/components/glass/glass-modal";
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
import { getReviewQueue, submitReview, type ReviewDecision } from "@/lib/review";
import { getDisplayName } from "@/lib/user";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

function claimText(item: Detection) {
  return item.claim_text || item.input_text || "";
}

function displayLabel(label: string | null) {
  if (!label) return "Pending";
  if (label === "Misinformation") return "Non-Reliable";
  return label;
}

function isReviewed(item: Detection) {
  return item.review_status === "corrected" || item.review_status === "confirmed";
}

function reviewedByLabel(item: Detection) {
  if (!isReviewed(item)) return "Waiting";
  const name = (item.advisor_name || "").trim();
  return name ? `Reviewed by ${name}` : "Reviewed";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function ReviewContent() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Detection[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<Detection | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>("corrected");
  const [correctedClaim, setCorrectedClaim] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pagination = useTablePagination(items, 10);

  async function loadQueue(silent = false) {
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await getReviewQueue(token);
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setPendingCount(
        data.pending_count ??
          nextItems.filter((item) => item.review_status === "pending").length,
      );
    } catch (error) {
      if (silent) return;
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to load the review queue.";
      toast.error(message);
      setItems([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
    const timer = window.setInterval(() => {
      void loadQueue(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [token]);

  function openReview(item: Detection, nextDecision: ReviewDecision) {
    if (isReviewed(item)) return;
    setActiveItem(item);
    setDecision(nextDecision);
    setCorrectedClaim("");
    setFormError(null);
  }

  function closeReview() {
    if (isSaving) return;
    setActiveItem(null);
    setCorrectedClaim("");
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !activeItem) return;

    const trimmedCorrection = correctedClaim.trim();
    if (decision === "corrected" && !trimmedCorrection) {
      setFormError("Enter the corrected sentence for the original user.");
      return;
    }

    setIsSaving(true);
    try {
      await submitReview(token, {
        prediction_id: activeItem.id,
        decision,
        corrected_claim:
          decision === "corrected" ? trimmedCorrection : undefined,
      });
      useChatStore.setState((state) => ({
        historyRevision: state.historyRevision + 1,
      }));
      toast.success(
        decision === "corrected"
          ? "Corrected sentence sent to the original user's History."
          : "Non-Reliable verdict confirmed.",
      );
      const reviewerName = user ? getDisplayName(user) : "you";
      setItems((current) =>
        current.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                review_status: decision,
                needs_review: false,
                advisor_name: reviewerName,
                corrected_claim_text:
                  decision === "corrected" ? trimmedCorrection : item.corrected_claim_text,
              }
            : item,
        ),
      );
      setPendingCount((count) => Math.max(0, count - 1));
      setActiveItem(null);
      setCorrectedClaim("");
      setFormError(null);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to submit this review.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PrivatePage
      title="Review queue"
      description="Every doctor sees Non-Reliable claims. After one doctor corrects a sentence, other doctors cannot correct it."
    >
      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Pending reviews
            </h2>
            <p className="text-sm text-[#475569]">
              {pendingCount === 1
                ? "1 claim waiting for review."
                : `${pendingCount} claims waiting for review.`}
            </p>
          </div>
        }
        footer={
          !isLoading && items.length > 0 ? (
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
            <GlassTableHeaderCell>Claim</GlassTableHeaderCell>
            <GlassTableHeaderCell>AI label</GlassTableHeaderCell>
            <GlassTableHeaderCell>Date</GlassTableHeaderCell>
            <GlassTableHeaderCell>Reviewed</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Actions
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={6}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : pagination.pageItems.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={6}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="verified" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    Queue is clear
                  </p>
                  <p className="text-sm text-[#475569]">
                    No Non-Reliable claims are waiting for review.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((item) => {
              const reviewed = isReviewed(item);
              return (
              <GlassTableRow
                key={item.id}
                className={reviewed ? "opacity-60" : undefined}
              >
                <GlassTableCell className="whitespace-nowrap">
                  <p className="font-medium text-[#0f172a]">
                    {item.user_name || "User"}
                  </p>
                  {item.user_email ? (
                    <p className="text-xs text-[#64748b]">{item.user_email}</p>
                  ) : null}
                </GlassTableCell>
                <GlassTableCell className="max-w-[360px]">
                  <p className="line-clamp-3 font-medium text-[#0f172a]">
                    {claimText(item)}
                  </p>
                </GlassTableCell>
                <GlassTableCell>
                  <GlassBadge tone={reviewed ? "success" : "danger"}>
                    {displayLabel(item.label)}
                  </GlassBadge>
                </GlassTableCell>
                <GlassTableCell className="whitespace-nowrap text-[#475569]">
                  {formatDate(item.created_at)}
                </GlassTableCell>
                <GlassTableCell>
                  {reviewed ? (
                    <GlassBadge tone="info">{reviewedByLabel(item)}</GlassBadge>
                  ) : (
                    <span className="text-sm text-[#94a3b8]">Waiting</span>
                  )}
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <GlassButton
                    type="button"
                    size="sm"
                    disabled={reviewed}
                    onClick={() => openReview(item, "corrected")}
                  >
                    {reviewed ? "Reviewed" : "Correct"}
                  </GlassButton>
                </GlassTableCell>
              </GlassTableRow>
              );
            })
          )}
        </GlassTableBody>
      </DataTableCard>

      <GlassModal
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) closeReview();
        }}
        title="Correct to Reliable"
        description="Rewrite the claim. History will show the original sentence, your correction, and the user."
      >
        {activeItem ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-[#64748b]">User</p>
              <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                {activeItem.user_name || "User"}
                {activeItem.user_email ? ` · ${activeItem.user_email}` : ""}
              </p>
              <p className="mt-3 text-xs font-medium text-[#64748b]">
                Previous claim
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#0f172a]">
                {claimText(activeItem)}
              </p>
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="corrected-claim">
                Corrected sentence
              </GlassLabel>
              <GlassTextarea
                id="corrected-claim"
                value={correctedClaim}
                aria-invalid={Boolean(formError)}
                aria-describedby={
                  formError ? "corrected-claim-error" : undefined
                }
                placeholder="Write the reliable version of this claim…"
                onChange={(event) => {
                  setCorrectedClaim(event.target.value);
                  if (formError) setFormError(null);
                }}
              />
              {formError ? (
                <p
                  id="corrected-claim-error"
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="flex gap-3 pt-1">
              <GlassButton type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : "Submit correction"}
              </GlassButton>
              <GlassButton
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={closeReview}
              >
                Cancel
              </GlassButton>
            </div>
          </form>
        ) : null}
      </GlassModal>
    </PrivatePage>
  );
}

export default function ReviewPage() {
  return (
    <ProtectedRoute roles={["healthcare_advisor"]}>
      <AppShell>
        <ReviewContent />
      </AppShell>
    </ProtectedRoute>
  );
}
