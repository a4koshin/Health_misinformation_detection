import { API_BASE, apiFetch } from "@/lib/api";
import type {
  Conversation,
  Detection,
  ReportRow,
  UserDashboardStats,
  UserReportResponse,
} from "@/types/api";

export async function getHistory(token: string): Promise<Detection[]> {
  const data = await apiFetch<Detection[] | { items?: Detection[] }>(
    "/api/history?per_page=100",
    {},
    token,
  );

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export async function getUserDashboardStats(
  token: string,
): Promise<UserDashboardStats> {
  return apiFetch<UserDashboardStats>("/api/history/stats", {}, token);
}

export async function getUserReport(
  token: string,
  filters?: { role?: string; doctorId?: string },
): Promise<UserReportResponse> {
  const params = new URLSearchParams();
  if (filters?.role && filters.role !== "all") {
    params.set("role", filters.role);
  }
  if (filters?.doctorId && filters.doctorId !== "all") {
    params.set("doctor_id", filters.doctorId);
  }
  const query = params.toString();
  return apiFetch<UserReportResponse>(
    `/api/report${query ? `?${query}` : ""}`,
    {},
    token,
  );
}

function csvCell(value: string | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadReportCsv(rows: ReportRow[], filename?: string) {
  const header = [
    "user_name",
    "user_email",
    "user_role",
    "claim",
    "label",
    "source",
    "reviewed_by",
    "created_at",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.user_name),
        csvCell(row.user_email),
        csvCell(row.user_role || "user"),
        csvCell(row.claim),
        csvCell(row.label),
        csvCell(row.source || "Manual check"),
        csvCell(row.advisor_name),
        csvCell(row.created_at),
      ].join(","),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ??
    `healthai-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadUserReport(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/report/download`, {
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