"use client";

import { cn } from "@/lib/utils";

export function PrivatePage({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "scrollbar-none flex w-full min-w-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-4 pt-5 pb-6 sm:gap-6 sm:px-6 sm:pt-6 sm:pb-8 lg:px-8",
          className,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#0f172a] sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-relaxed text-[#475569]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {actions}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
