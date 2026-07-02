"use client";

import { create } from "zustand";

type ChatState = {
  activeChatId: string | null;
  startNewChat: () => void;
  selectChat: (id: string) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  startNewChat: () => set({ activeChatId: null }),
  selectChat: (id) => set({ activeChatId: id }),
}));
