import * as React from "react";

import { cn } from "@/lib/utils";

export function GlassTable({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("glass-strong rounded-3xl", className)}
      {...props}
    >
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function GlassTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-100 text-[#475569]">
      {children}
    </thead>
  );
}

export function GlassTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function GlassTableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
}

export function GlassTableHeaderCell({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-3 py-3 text-xs font-medium tracking-normal text-[#475569] sm:px-5 sm:py-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function GlassTableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-3 py-3 text-[#0f172a] sm:px-5 sm:py-3.5", className)}
      {...props}
    />
  );
}
