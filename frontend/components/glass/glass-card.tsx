import * as React from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = React.ComponentProps<"div"> & {
  /** Stronger, more opaque surface for content-heavy cards. */
  strong?: boolean;
};

export function GlassCard({
  className,
  strong = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn("rounded-3xl", strong ? "glass-strong" : "glass", className)}
      {...props}
    />
  );
}
