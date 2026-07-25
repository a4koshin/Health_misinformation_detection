import type { Conversation, Detection, StoredChatMessage } from "@/types/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export function mapStoredMessages(messages: StoredChatMessage[]): ChatMessage[] {
  return [...messages]
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    }))
    .sort(compareChatMessages);
}

/** Keep user messages before assistant replies when timestamps match. */
export function compareChatMessages(a: ChatMessage, b: ChatMessage): number {
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (timeA !== timeB) return timeA - timeB;
  if (a.role !== b.role) return a.role === "user" ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(value?: string): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getConversationTitle(conversation: Pick<Detection, "input_text">): string {
  return conversation.input_text.trim();
}
