import type { User } from "@/types/api";

export function getDisplayName(user: User): string {
  return user.full_name?.trim() || user.email;
}

export function getInitials(user: User): string {
  const name = user.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return user.email.slice(0, 2).toUpperCase();
}

export function truncateText(text: string, maxLength = 28): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}
