"use client";

import { create } from "zustand";

import { mapStoredMessages, type ChatMessage } from "@/lib/chat";
import {
  appendConversationMessage,
  createConversation,
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
    const trimmed = content.trim();
    if (!trimmed) return;

    const { activeChatId } = get();
    set({ isSaving: true });

    try {
      const conversation = activeChatId
        ? await appendConversationMessage(token, activeChatId, trimmed)
        : await createConversation(token, trimmed);

      set({
        ...applyConversation(conversation),
        historyRevision: get().historyRevision + 1,
        isSaving: false,
      });
    } catch {
      set({ isSaving: false });
      throw new Error("Unable to save chat to history.");
    }
  },
}));
