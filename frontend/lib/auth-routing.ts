import type { User } from "@/types/api";

export function getPrivateHomePath(user: Pick<User, "role"> | null | undefined) {
  if (!user) return "/login";
  if (user.role === "admin") return "/dashboard";
  if (user.role === "healthcare_advisor") return "/review";
  return "/prediction";
}
