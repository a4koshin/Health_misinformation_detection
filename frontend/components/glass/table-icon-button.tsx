"use client";

import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

type TableIconButtonProps = {
  label: string;
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "brand" | "danger";
  className?: string;
};

const toneClassNames = {
  neutral:
    "text-[#64748b] hover:bg-gray-100 hover:text-[#0f172a]",
  brand: "text-[#cc4a00] hover:bg-[#ff5c00]/10 hover:text-[#ff5c00]",
  danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
} as const;

export function TableIconButton({
  label,
  icon,
  onClick,
  disabled,
  tone = "neutral",
  className,
}: TableIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        toneClassNames[tone],
        className,
      )}
    >
      <MaterialIcon name={icon} size={18} />
    </button>
  );
}

export function TableEditButton({
  onClick,
  disabled,
  label = "Edit",
}: {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <TableIconButton
      label={label}
      icon="edit"
      tone="brand"
      onClick={onClick}
      disabled={disabled}
    />
  );
}

export function TableDeleteButton({
  onClick,
  disabled,
  label = "Delete",
}: {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <TableIconButton
      label={label}
      icon="delete"
      tone="danger"
      onClick={onClick}
      disabled={disabled}
    />
  );
}
