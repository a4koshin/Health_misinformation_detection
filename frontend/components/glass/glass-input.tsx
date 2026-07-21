import * as React from "react";

import { cn } from "@/lib/utils";

const glassFieldClassName =
  "w-full min-w-0 rounded-2xl border border-gray-200 bg-gray-100 px-4 text-[15px] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl transition-all duration-200 outline-none placeholder:text-[#64748b] hover:bg-gray-100 focus-visible:border-[#ff8a4d] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#ff5c00]/20 disabled:pointer-events-none disabled:opacity-50";

export function GlassInput({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        glassFieldClassName,
        "h-11 file:mr-3 file:inline-flex file:h-full file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#cc4a00]",
        className,
      )}
      {...props}
    />
  );
}

export function GlassTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(glassFieldClassName, "min-h-28 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function GlassSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(glassFieldClassName, "h-11 cursor-pointer", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function GlassLabel({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium text-[#0f172a]", className)}
      {...props}
    />
  );
}
