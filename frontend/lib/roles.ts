import type { UserRole } from "@/types/api";

export function displayRoleLabel(role: string | null | undefined): string {
  if (role === "healthcare_advisor") return "Healthcare Advisor";
  if (role === "admin") return "Admin";
  return "User";
}

export function shortRoleLabel(role: string | null | undefined): string {
  if (role === "healthcare_advisor") return "Advisor";
  if (role === "admin") return "Admin";
  return "User";
}

export function roleBadgeTone(
  role: string | null | undefined,
): "brand" | "neutral" | "info" {
  if (role === "admin") return "brand";
  if (role === "healthcare_advisor") return "info";
  return "neutral";
}

export const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "healthcare_advisor", label: "Healthcare Advisor" },
  { value: "admin", label: "Admin" },
];
