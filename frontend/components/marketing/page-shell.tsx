import * as React from "react";

import { GlassBadge } from "@/components/glass/glass-badge";
import { Reveal } from "@/components/glass/reveal";

/** Standard header block for public subpages (About, Features, ...). */
export function PageHeader({
  badge,
  title,
  description,
}: {
  badge: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <GlassBadge>{badge}</GlassBadge>
      <h1 className="mt-5 text-4xl font-normal tracking-tight text-[#0f172a] sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#475569] sm:text-lg">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}

/** Section wrapper with consistent width and spacing for public pages. */
export function PageSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">{children}</div>
    </section>
  );
}
