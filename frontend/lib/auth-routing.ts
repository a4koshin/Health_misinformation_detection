import type { User } from "@/types/api";

export function getPrivateHomePath(user: Pick<User, "role"> | null | undefined) {
  if (!user) return "/login";
  if (user.role === "admin") return "/dashboard";
  if (user.role === "doctor") return "/review";
  return "/prediction";
}
