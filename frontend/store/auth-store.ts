import { create } from "zustand";

import {
  clearToken,
  getMe,
  getToken,
  login as loginRequest,
  register as registerRequest,
  setToken,
} from "@/lib/auth";
import type { RegisterPayload, User } from "@/types/api";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, isLoading: false });
      return;
    }

    try {
      const user = await getMe(token);
      set({ user, isLoading: false });
    } catch {
      clearToken();
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const token = await loginRequest(email, password);
    setToken(token.access_token);
    const user = await getMe(token.access_token);
    set({ user });
  },

  register: async (data) => {
    await registerRequest(data);
    const token = await loginRequest(data.email, data.password);
    setToken(token.access_token);
    const user = await getMe(token.access_token);
    set({ user });
  },

  logout: () => {
    clearToken();
    set({ user: null });
  },
}));

export function useAuth() {
  return useAuthStore();
}
