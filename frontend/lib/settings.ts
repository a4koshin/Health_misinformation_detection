import { apiFetch } from "@/lib/api";
import type {
  AppLanguage,
  ChangePasswordRequest,
  DeleteAccountRequest,
  SettingsMessageResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }
  return `${API_BASE}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;
}

export async function getProfile(token: string): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/settings/profile", {}, token);
}

export async function updateProfile(
  token: string,
  payload: UpdateProfileRequest,
): Promise<SettingsMessageResponse & UserProfile> {
  return apiFetch<SettingsMessageResponse & UserProfile>(
    "/api/settings/profile",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function changePassword(
  token: string,
  payload: ChangePasswordRequest,
): Promise<SettingsMessageResponse> {
  return apiFetch<SettingsMessageResponse>(
    "/api/settings/password",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateLanguage(
  token: string,
  language: AppLanguage,
): Promise<SettingsMessageResponse> {
  return apiFetch<SettingsMessageResponse>(
    "/api/settings/language",
    {
      method: "PUT",
      body: JSON.stringify({ language }),
    },
    token,
  );
}

export async function uploadAvatar(
  token: string,
  file: File,
): Promise<SettingsMessageResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<SettingsMessageResponse>(
    "/api/settings/avatar",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

export async function deleteHistory(
  token: string,
): Promise<SettingsMessageResponse> {
  return apiFetch<SettingsMessageResponse>(
    "/api/settings/history",
    { method: "DELETE" },
    token,
  );
}

export async function deleteAccount(
  token: string,
  payload: DeleteAccountRequest,
): Promise<SettingsMessageResponse> {
  return apiFetch<SettingsMessageResponse>(
    "/api/settings/account",
    {
      method: "DELETE",
      body: JSON.stringify(payload),
    },
    token,
  );
}
