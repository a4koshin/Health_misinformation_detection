"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChatView } from "@/components/chat/ChatView";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ChatView />
      </AppShell>
    </ProtectedRoute>
  );
}
