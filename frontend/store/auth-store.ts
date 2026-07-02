"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  ApiError,
  getCurrentUser,
  loginRequest,
  registerRequest,
} from "@/lib/api";
import type { RegisterPayload, User } from "@/types/api";

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { access_token } = await loginRequest(email, password);
          const user = await getCurrentUser(access_token);
          set({ user, token: access_token, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          await registerRequest(payload);
          const { access_token } = await loginRequest(
            payload.email,
            payload.password,
          );
          const user = await getCurrentUser(access_token);
          set({ user, token: access_token, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      initialize: async () => {
        const { token } = get();
        if (!token) {
          set({ isInitialized: true, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await getCurrentUser(token);
          set({ user, isLoading: false, isInitialized: true });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            set({ user: null, token: null });
          }
          set({ isLoading: false, isInitialized: true });
        }
      },
    }),
    {
      name: "healthai-auth",
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

export function useAuth() {
  return useAuthStore();
}
