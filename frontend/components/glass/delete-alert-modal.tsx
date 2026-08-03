"use client";

import { Dialog as DialogPrimitive } from "radix-ui";

import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

type DeleteAlertModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
};

export function DeleteAlertModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure you want to delete this item?",
  description,
  itemLabel,
  confirmLabel = "Yes, I'm sure",
  cancelLabel = "No, cancel",
  isLoading = false,
}: DeleteAlertModalProps) {
  async function handleConfirm() {
    await onConfirm();
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (isLoading) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Close
            disabled={isLoading}
            className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-gray-100 hover:text-[#475569] disabled:pointer-events-none"
            aria-label="Close dialog"
          >
            <MaterialIcon name="close" size={20} />
          </DialogPrimitive.Close>

          <div className="flex flex-col items-center px-2 pt-4 pb-2 text-center">
            <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <MaterialIcon name="delete" size={32} />
            </span>

            <DialogPrimitive.Title className="max-w-sm text-lg font-semibold leading-snug text-[#111827]">
              {title}
            </DialogPrimitive.Title>

            {description ? (
              <DialogPrimitive.Description className="mt-2 max-w-sm text-sm text-[#6b7280]">
                {description}
              </DialogPrimitive.Description>
            ) : itemLabel ? (
              <DialogPrimitive.Description className="sr-only">
                Delete {itemLabel}. This action cannot be undone.
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                Confirm deletion. This action cannot be undone.
              </DialogPrimitive.Description>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-[#374151] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void handleConfirm()}
              className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
