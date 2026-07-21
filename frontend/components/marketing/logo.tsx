import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-xl bg-[#ff5c00] shadow-[0_8px_20px_-8px_rgba(255,92,0,0.7)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5 text-white"
        aria-hidden="true"
      >
        <path
          d="M12 21s-7-4.35-9.33-9.03C1.06 8.73 3.1 5 6.6 5c2.04 0 3.44 1.13 4.4 2.53h2c.96-1.4 2.36-2.53 4.4-2.53 3.5 0 5.54 3.73 3.93 6.97C19 16.65 12 21 12 21Z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M3 12h4l2-4 3 7 2-3h7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-normal tracking-tight text-[#0f172a]">
        Health<span className="text-gradient-brand">AI</span>
      </span>
    </Link>
  );
}
