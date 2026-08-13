import type { UserRole } from "@/types/api";

export function displayRoleLabel(role: string | null | undefined): string {
  if (role === "doctor" || role === "healthcare_advisor") return "Doctor";
  if (role === "admin") return "Admin";
  return "User";
}

export function shortRoleLabel(role: string | null | undefined): string {
  if (role === "doctor" || role === "healthcare_advisor") return "Doctor";
  if (role === "admin") return "Admin";
  return "User";
}

export function roleBadgeTone(
  role: string | null | undefined,
): "brand" | "neutral" | "info" {
  if (role === "admin") return "brand";
  if (role === "doctor" || role === "healthcare_advisor") return "info";
  return "neutral";
}

/** Roles assignable on the Users page (doctors are created on /doctors). */
export const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];
