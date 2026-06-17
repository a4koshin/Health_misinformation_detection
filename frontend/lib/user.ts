import type { User } from "@/types/api";

export function getDisplayName(user: User): string {
  if (user.full_name?.trim()) {
    return user.full_name;
  }
  return user.email.split("@")[0];
}

export function getInitials(user: User): string {
  if (user.full_name?.trim()) {
    return user.full_name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return user.email[0].toUpperCase();
}

export function truncateText(text: string, maxLength = 28): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}
