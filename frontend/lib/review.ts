import { apiFetch } from "@/lib/api";
import type { Detection } from "@/types/api";

export type ReviewDecision = "confirmed" | "corrected";

export type ReviewQueueResponse = {
  items: Detection[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

export async function getReviewQueue(
  token: string,
  page = 1,
  perPage = 100,
): Promise<ReviewQueueResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  return apiFetch<ReviewQueueResponse>(
    `/api/review/queue?${params.toString()}`,
    {},
    token,
  );
}

export async function submitReview(
  token: string,
  payload: {
    prediction_id: string | number;
    decision: ReviewDecision;
    note?: string;
    corrected_claim?: string;
  },
): Promise<Detection> {
  return apiFetch<Detection>(
    "/api/review/submit",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}
