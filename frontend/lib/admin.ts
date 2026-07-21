import { apiFetch } from "@/lib/api";
import type {
  AdminUserCreate,
  AdminUserUpdate,
  DashboardStats,
  DatasetPredictionResponse,
  User,
} from "@/types/api";

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/admin/dashboard", {}, token);
}

export async function listUsers(token: string): Promise<User[]> {
  return apiFetch<User[]>("/api/admin/users", {}, token);
}

export async function createUser(
  token: string,
  payload: AdminUserCreate,
): Promise<User> {
  return apiFetch<User>(
    "/api/admin/users",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateUser(
  token: string,
  userId: string,
  payload: AdminUserUpdate,
): Promise<User> {
  return apiFetch<User>(
    `/api/admin/users/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deleteUser(token: string, userId: string): Promise<void> {
  await apiFetch<void>(
    `/api/admin/users/${userId}`,
    { method: "DELETE" },
    token,
  );
}

export async function predictDataset(
  token: string,
  file: File,
): Promise<DatasetPredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<DatasetPredictionResponse>(
    "/api/admin/dataset/predict",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}
