"use client";

import { Dialog as DialogPrimitive } from "radix-ui";

import { GlassButton } from "@/components/glass/glass-button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

type PaymentResultModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone: "success" | "error";
  title: string;
  message: string;
};

export function PaymentResultModal({
  open,
  onOpenChange,
  tone,
  title,
  message,
}: PaymentResultModalProps) {
  const isSuccess = tone === "success";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#0f172a]/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex flex-col items-center px-1 pt-1 pb-1 text-center">
            <span
              className={cn(
                "mb-4 flex size-14 items-center justify-center rounded-full",
                isSuccess
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600",
              )}
            >
              <MaterialIcon
                name={isSuccess ? "check_circle" : "error"}
                size={32}
              />
            </span>

            <DialogPrimitive.Title className="text-lg font-semibold leading-snug text-[#111827]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-[#6b7280]">
              {message}
            </DialogPrimitive.Description>
          </div>

          <div className="mt-6 flex gap-2">
            <GlassButton
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="button"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              OK
            </GlassButton>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
