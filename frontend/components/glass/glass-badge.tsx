import * as React from "react";

import { cn } from "@/lib/utils";

const toneClassNames = {
  brand: "border-[#ff5c00]/25 bg-[#ff5c00]/10 text-[#cc4a00]",
  neutral: "border-gray-200 bg-gray-100 text-[#475569]",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  danger: "border-red-500/25 bg-red-500/10 text-red-700",
} as const;

export function GlassBadge({
  className,
  tone = "brand",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof toneClassNames }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-xl",
        toneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}
