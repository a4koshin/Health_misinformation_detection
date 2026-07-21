import * as React from "react";

import { GlassCard } from "@/components/glass/glass-card";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

export function GlassFeatureCard({
  icon,
  title,
  description,
  className,
}: {
  icon: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <GlassCard className={cn("p-6", className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
        <MaterialIcon name={icon} size={24} />
      </span>
      <h3 className="mb-2 text-base font-semibold text-[#0f172a]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#475569]">{description}</p>
    </GlassCard>
  );
}
