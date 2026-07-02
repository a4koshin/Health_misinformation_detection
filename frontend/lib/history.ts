import { apiFetch } from "@/lib/api";
import type { Detection } from "@/types/api";

export async function getHistory(token: string): Promise<Detection[]> {
  return apiFetch<Detection[]>("/api/history", {}, token);
}
