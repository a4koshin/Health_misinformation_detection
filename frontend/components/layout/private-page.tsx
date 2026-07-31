"use client";

export function PrivatePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 overflow-y-auto px-4 pt-14 pb-6 sm:gap-6 sm:px-6 sm:pt-8 sm:pb-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1 pr-12 sm:pr-0">
            <h1 className="text-xl font-normal tracking-tight text-[#0f172a] sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
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
