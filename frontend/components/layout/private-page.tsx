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
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-normal tracking-tight text-[#0f172a]">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-[#475569]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
