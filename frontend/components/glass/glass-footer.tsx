import Link from "next/link";

import { Logo } from "@/components/marketing/logo";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact us" },
];

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#0f172a] shadow-sm transition-colors duration-200 hover:border-[#ff5c00] hover:text-[#ff5c00]"
    >
      {children}
    </a>
  );
}

export function GlassFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-gray-100 bg-white">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Top row: brand + pill nav links */}
        <div className="flex flex-col items-center justify-between gap-6 pt-12 lg:flex-row">
          <Logo />

          <nav
            className="flex flex-wrap items-center justify-center gap-3"
            aria-label="Footer"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-gray-200 bg-white px-5 py-2 text-xs font-medium tracking-normal text-[#0f172a] shadow-sm transition-colors duration-200 hover:border-[#ff5c00] hover:text-[#ff5c00]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Giant watermark */}
        <div
          className="pointer-events-none flex justify-center select-none"
          aria-hidden="true"
        >
          <span className="translate-y-[18%] bg-gradient-to-b from-[#0f172a]/[0.06] to-[#0f172a]/[0.015] bg-clip-text text-[24vw] leading-none font-extrabold tracking-tight text-transparent uppercase lg:text-[19rem]">
            SomAI
          </span>
        </div>

        {/* Bottom row: copyright + socials */}
        <div className="relative flex flex-col items-center justify-between gap-4 pb-8 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#64748b]">
            <p>
              © {new Date().getFullYear()} SomAI. All Rights Reserved.
            </p>
            <Link
              href="/privacy"
              className="transition-colors hover:text-[#ff5c00]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-[#ff5c00]"
            >
              Terms &amp; Conditions
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <SocialButton href="https://x.com" label="X (Twitter)">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M4 4h3.9l4.5 6 5-6H20l-6.4 7.6L20.5 20h-3.9l-4.8-6.4L6.4 20H3.7l6.8-8.1L4 4Z" />
              </svg>
            </SocialButton>
            <SocialButton href="https://instagram.com" label="Instagram">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-4"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </SocialButton>
            <SocialButton href="https://linkedin.com" label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M6.94 8.5H4.06V20h2.88V8.5ZM5.5 7.19a1.69 1.69 0 1 0 0-3.38 1.69 1.69 0 0 0 0 3.38ZM20 13.57c0-3.06-1.63-4.48-3.81-4.48-1.76 0-2.55.97-2.99 1.65V8.5H10.3V20h2.9v-6.21c0-1.64.75-2.62 2.19-2.62 1.32 0 1.71 1.05 1.71 2.66V20H20v-6.43Z" />
              </svg>
            </SocialButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
