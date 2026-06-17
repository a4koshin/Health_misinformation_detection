import { apiRequest } from "@/lib/api";
import type { RegisterPayload, Token, User } from "@/types/api";

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<Token> {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  return apiRequest<Token>("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function register(data: RegisterPayload): Promise<User> {
  return apiRequest<User>("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function getMe(token: string): Promise<User> {
  return apiRequest<User>("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
