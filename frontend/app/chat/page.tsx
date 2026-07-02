"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { ChatView } from "@/components/chat/chat-view";
import { AppShell } from "@/components/layout/app-shell";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ChatView />
      </AppShell>
    </ProtectedRoute>
  );
}
