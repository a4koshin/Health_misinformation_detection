import { apiFetch } from "@/lib/api";
import type {
  AdminUserCreate,
  AdminUserUpdate,
  AuditLog,
  DashboardStats,
  DatasetPredictionResponse,
  Detection,
  DoctorCreate,
  DoctorProfile,
  DoctorUpdate,
  User,
} from "@/types/api";

export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/admin/dashboard", {}, token);
}

export async function listUsers(token: string): Promise<User[]> {
  return apiFetch<User[]>("/api/admin/users", {}, token);
}

export async function listAuditLogs(token: string): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>("/api/admin/audit-logs", {}, token);
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

export async function setUserActive(
  token: string,
  userId: string,
  isActive: boolean,
): Promise<User> {
  return apiFetch<User>(
    `/api/admin/users/${userId}/active`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    },
    token,
  );
}

export async function approveAccountDeletion(
  token: string,
  userId: string,
): Promise<User> {
  return apiFetch<User>(
    `/api/admin/users/${userId}/approve-deletion`,
    { method: "POST" },
    token,
  );
}

export async function listDoctors(token: string): Promise<DoctorProfile[]> {
  return apiFetch<DoctorProfile[]>("/api/admin/doctors", {}, token);
}

export async function createDoctor(
  token: string,
  payload: DoctorCreate,
): Promise<DoctorProfile> {
  const formData = new FormData();
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("name", payload.name);
  formData.append("job_title", payload.job_title);
  formData.append("workplace", payload.workplace);
  formData.append("license", payload.license);
  formData.append("profile_image", payload.profile_image);

  return apiFetch<DoctorProfile>(
    "/api/admin/doctors",
    {
      method: "POST",
      body: formData,
    },
    token,
  );
}

export async function updateDoctor(
  token: string,
  doctorId: string,
  payload: DoctorUpdate,
): Promise<DoctorProfile> {
  const formData = new FormData();
  if (payload.email !== undefined) formData.append("email", payload.email);
  if (payload.password) formData.append("password", payload.password);
  if (payload.name !== undefined) formData.append("name", payload.name);
  if (payload.job_title !== undefined) {
    formData.append("job_title", payload.job_title);
  }
  if (payload.workplace !== undefined) {
    formData.append("workplace", payload.workplace);
  }
  if (payload.license) formData.append("license", payload.license);
  if (payload.profile_image) {
    formData.append("profile_image", payload.profile_image);
  }

  return apiFetch<DoctorProfile>(
    `/api/admin/doctors/${doctorId}`,
    {
      method: "PATCH",
      body: formData,
    },
    token,
  );
}

export async function deleteDoctor(
  token: string,
  doctorId: string,
): Promise<{ message: string; id: string; email: string }> {
  return apiFetch<{ message: string; id: string; email: string }>(
    `/api/admin/doctors/${doctorId}`,
    { method: "DELETE" },
    token,
  );
}

export type AdminReviewQueueResponse = {
  items: Detection[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
  awaiting_count?: number;
  assigned_pending_count?: number;
};

export async function getAdminReviewQueue(
  token: string,
  status: "awaiting_assignment" | "pending" | "all" = "awaiting_assignment",
  page = 1,
  perPage = 100,
): Promise<AdminReviewQueueResponse> {
  const params = new URLSearchParams({
    status,
    page: String(page),
    per_page: String(perPage),
  });
  return apiFetch<AdminReviewQueueResponse>(
    `/api/admin/review/queue?${params.toString()}`,
    {},
    token,
  );
}

export async function assignReview(
  token: string,
  payload: { prediction_id: string | number; doctor_user_id: string | number },
): Promise<Detection> {
  return apiFetch<Detection>(
    "/api/admin/review/assign",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
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
