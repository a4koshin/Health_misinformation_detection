"use client";

import { create } from "zustand";

import { mapStoredMessages, type ChatMessage } from "@/lib/chat";
import {
  appendConversationMessage,
  createConversation,
  editConversationMessage,
} from "@/lib/history";
import type { Conversation } from "@/types/api";

export type { ChatMessage };

type ChatState = {
  activeChatId: string | null;
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  historyRevision: number;
  greetingNonce: number;
  isSaving: boolean;
  startNewChat: () => void;
  selectChat: (id: string) => void;
  setConversation: (conversation: Conversation | null) => void;
  removeChat: (id: string) => void;
  sendMessage: (content: string, token: string) => Promise<void>;
  editMessage: (
    messageId: string,
    content: string,
    token: string,
  ) => Promise<void>;
};

function applyConversation(conversation: Conversation) {
  return {
    activeChatId: conversation.id,
    activeConversation: conversation,
    messages: mapStoredMessages(conversation.messages),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  activeConversation: null,
  messages: [],
  historyRevision: 0,
  greetingNonce: 0,
  isSaving: false,

  startNewChat: () =>
    set((state) => ({
      activeChatId: null,
      activeConversation: null,
      messages: [],
      greetingNonce: state.greetingNonce + 1,
    })),

  selectChat: (id) =>
    set({
      activeChatId: id,
      activeConversation: null,
      messages: [],
    }),

  setConversation: (conversation) => {
    if (!conversation) {
      set({ activeConversation: null, messages: [] });
      return;
    }

    set(applyConversation(conversation));
  },

  removeChat: (id) => {
    const { activeChatId, historyRevision, greetingNonce } = get();
    if (activeChatId === id) {
      set({
        activeChatId: null,
        activeConversation: null,
        messages: [],
        historyRevision: historyRevision + 1,
        greetingNonce: greetingNonce + 1,
      });
      return;
    }

    set({ historyRevision: historyRevision + 1 });
  },

  sendMessage: async (content, token) => {
    if (!content) return;

    const { activeChatId, messages } = get();
    const optimisticUser: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content,
    };

    set({
      isSaving: true,
      messages: [...messages, optimisticUser],
    });

    const startedAt = Date.now();
    const minLoadingMs = 900;

    try {
      const conversation = activeChatId
        ? await appendConversationMessage(token, activeChatId, content)
        : await createConversation(token, content);

      const elapsed = Date.now() - startedAt;
      if (elapsed < minLoadingMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingMs - elapsed),
        );
      }

      set({
        ...applyConversation(conversation),
        historyRevision: get().historyRevision + 1,
        isSaving: false,
      });
    } catch (error) {
      set({
        isSaving: false,
        messages: get().messages.filter(
          (message) => message.id !== optimisticUser.id,
        ),
      });
      throw error;
    }
  },

  editMessage: async (messageId, content, token) => {
    const trimmed = content.trim();
    const { activeChatId } = get();
    if (!trimmed) {
      throw new Error("Message cannot be empty.");
    }
    if (!activeChatId) {
      throw new Error("No active chat to update.");
    }

    set({ isSaving: true });

    try {
      const conversation = await editConversationMessage(
        token,
        activeChatId,
        messageId,
        trimmed,
      );

      set({
        ...applyConversation(conversation),
        historyRevision: get().historyRevision + 1,
        isSaving: false,
      });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },
}));
