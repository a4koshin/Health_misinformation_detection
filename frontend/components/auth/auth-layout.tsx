import Link from "next/link";

import { Logo } from "@/components/marketing/logo";
import { MaterialIcon } from "@/components/ui/material-icon";

export function AuthLayout({
  title,
  description,
  children,
  footer,
  backHref,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="liquid-bg flex min-h-dvh items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Logo />
          {backHref ? (
            <Link
              href={backHref}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#475569] transition-colors hover:bg-gray-100 hover:text-[#0f172a]"
              aria-label="Back to sign in"
            >
              <MaterialIcon name="arrow_back" size={20} />
            </Link>
          ) : (
            <Link
              href="/"
              className="shrink-0 text-sm font-medium text-[#475569] transition-colors hover:text-[#ff5c00]"
            >
              Back to home
            </Link>
          )}
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-9">
          <header className="mb-6 space-y-2 sm:mb-8">
            <h1 className="text-xl font-normal tracking-tight text-[#0f172a] sm:text-2xl">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-[#475569]">
              {description}
            </p>
          </header>

          {children}

          {footer ? <footer className="mt-8">{footer}</footer> : null}
        </div>
      </div>
    </div>
  );
}

export function AuthFieldLabel({
  htmlFor,
  children,
  action,
}: {
  htmlFor: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold tracking-widest text-[#0f172a] uppercase"
      >
        {children}
      </label>
      {action}
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="text-center text-sm text-[#475569]">
      {text}{" "}
      <Link
        href={href}
        className="font-medium text-[#ff5c00] transition-colors hover:text-[#cc4a00]"
      >
        {linkText}
      </Link>
    </p>
  );
}
