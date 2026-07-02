import Link from "next/link";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4 py-12">
      <div className="w-full max-w-[420px]">
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </header>

        {children}

        {footer ? <footer className="mt-8">{footer}</footer> : null}
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
        className="text-xs font-semibold tracking-widest text-foreground uppercase"
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
    <p className="text-center text-sm text-muted-foreground">
      {text}{" "}
      <Link
        href={href}
        className="font-medium text-primary transition-colors hover:text-primary/80"
      >
        {linkText}
      </Link>
    </p>
  );
}
