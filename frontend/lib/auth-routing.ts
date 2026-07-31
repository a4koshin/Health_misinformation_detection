import type { User } from "@/types/api";

export function getPrivateHomePath(user: Pick<User, "role"> | null | undefined) {
  if (!user) return "/login";
  return user.role === "admin" ? "/dashboard" : "/prediction";
}
