"use client";

import type { ReactNode } from "react";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassModal } from "@/components/glass/glass-modal";
import { TableIconButton } from "@/components/glass/table-icon-button";

export type DetailField = {
  label: string;
  value?: ReactNode;
};

export function ViewDetailsButton({
  onClick,
  label = "View details",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <TableIconButton
      label={label}
      icon="visibility"
      tone="brand"
      onClick={onClick}
    />
  );
}

export function ViewDetailsModal({
  open,
  onOpenChange,
  title = "Details",
  description,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  fields: DetailField[];
}) {
  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-w-xl"
    >
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {fields.map((field) => (
          <div
            key={field.label}
            className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <p className="text-xs font-medium tracking-wide text-[#64748b] uppercase">
              {field.label}
            </p>
            <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-[#0f172a]">
              {field.value === null ||
              field.value === undefined ||
              field.value === ""
                ? "—"
                : field.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <GlassButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Close
        </GlassButton>
      </div>
    </GlassModal>
  );
}

export function displayOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
