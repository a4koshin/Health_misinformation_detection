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

function userFromAuthPayload(data: {
  user?: User;
  access_token?: string;
  id?: string;
  email?: string;
  role?: User["role"];
  full_name?: string | null;
  avatar_url?: string | null;
  language_preference?: User["language_preference"];
  created_at?: string;
}): User | null {
  if (data.user?.id && data.user.email) {
    return data.user;
  }
  if (data.id && data.email && data.role && data.created_at) {
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name ?? null,
      role: data.role,
      avatar_url: data.avatar_url,
      language_preference: data.language_preference,
      created_at: data.created_at,
    };
  }
  return null;
}

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
          const data = await loginRequest(email, password);
          const user = userFromAuthPayload(data);
          if (!data.access_token || !user) {
            throw new ApiError(500, "Login response was missing user details.");
          }
          set({ user, token: data.access_token, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (payload) => {
        set({ isLoading: true });
        try {
          const data = await registerRequest(payload);
          const user = userFromAuthPayload(data);
          if (data.access_token && user) {
            set({ user, token: data.access_token, isLoading: false });
            return;
          }
          const loginData = await loginRequest(payload.email, payload.password);
          const loginUser = userFromAuthPayload(loginData);
          if (!loginData.access_token || !loginUser) {
            throw new ApiError(500, "Register response was missing user details.");
          }
          set({ user: loginUser, token: loginData.access_token, isLoading: false });
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
