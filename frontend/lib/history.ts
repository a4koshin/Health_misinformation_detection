import { apiFetch } from "@/lib/api";
import type {
  Conversation,
  Detection,
  UserDashboardStats,
  UserReportResponse,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export async function getHistory(token: string): Promise<Detection[]> {
  return apiFetch<Detection[]>("/api/history", {}, token);
}

export async function getUserDashboardStats(
  token: string,
): Promise<UserDashboardStats> {
  return apiFetch<UserDashboardStats>("/api/history/stats", {}, token);
}

export async function getUserReport(
  token: string,
): Promise<UserReportResponse> {
  return apiFetch<UserReportResponse>("/api/history/report", {}, token);
}

export async function downloadUserReport(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/history/report/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Unable to download report.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? "healthai-report.csv";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function getConversation(
  token: string,
  conversationId: string,
): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/history/${conversationId}`, {}, token);
}

export async function createConversation(
  token: string,
  inputText: string,
): Promise<Conversation> {
  return apiFetch<Conversation>(
    "/api/history",
    {
      method: "POST",
      body: JSON.stringify({ input_text: inputText }),
    },
    token,
  );
}

export async function appendConversationMessage(
  token: string,
  conversationId: string,
  content: string,
): Promise<Conversation> {
  return apiFetch<Conversation>(
    `/api/history/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
    token,
  );
}

export async function editConversationMessage(
  token: string,
  conversationId: string,
  messageId: string,
  content: string,
): Promise<Conversation> {
  return apiFetch<Conversation>(
    `/api/history/${conversationId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
    token,
  );
}

export async function deleteConversation(
  token: string,
  conversationId: string,
): Promise<void> {
  await apiFetch<void>(
    `/api/history/${conversationId}`,
    { method: "DELETE" },
    token,
  );
}