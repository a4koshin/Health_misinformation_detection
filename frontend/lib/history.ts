import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Detection } from "@/types/api";

export async function getHistory(): Promise<Detection[]> {
  const token = getToken();
  if (!token) {
    return [];
  }

  return apiRequest<Detection[]>("/api/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
