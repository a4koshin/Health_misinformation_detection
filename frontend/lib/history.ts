import { apiFetch } from "@/lib/api";
import type { Conversation, Detection } from "@/types/api";

export async function getHistory(token: string): Promise<Detection[]> {
  return apiFetch<Detection[]>("/api/history", {}, token);
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