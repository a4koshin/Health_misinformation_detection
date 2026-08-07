"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";

import { GlassButton } from "@/components/glass/glass-button";
import { Logo } from "@/components/marketing/logo";
import { MaterialIcon } from "@/components/ui/material-icon";
import { getPrivateHomePath } from "@/lib/auth-routing";
import { useAuth } from "@/store/auth-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact" },
];

function NavDivider() {
  return (
    <span className="text-[#0f172a]/25 select-none" aria-hidden="true">
      |
    </span>
  );
}

export function GlassNavbar() {
  const pathname = usePathname();
  const { user, isInitialized } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = isInitialized && !!user;

  const linkClassName = (active: boolean) =>
    cn(
      "px-1 text-[13px] font-medium tracking-normal transition-colors duration-200",
      active ? "text-[#ff5c00]" : "text-[#0f172a]/80 hover:text-[#ff5c00]",
    );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/10 shadow-[0_1px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-14 items-center justify-between gap-6 sm:h-16">
          <Logo
            className="relative z-10 overflow-visible"
            markClassName="h-9 w-auto origin-left scale-[1.55] object-contain object-left sm:h-10 sm:scale-[1.65] md:h-10"
          />

          <nav
            className="hidden items-center gap-4 lg:flex"
            aria-label="Main"
          >
            {navLinks.map((link, index) => (
              <Fragment key={link.href}>
                {index > 0 ? <NavDivider /> : null}
                <Link
                  href={link.href}
                  className={linkClassName(pathname === link.href)}
                >
                  {link.label}
                </Link>
              </Fragment>
            ))}

            <div className="ml-3 flex items-center gap-2.5">
              {isAuthenticated ? (
                <GlassButton
                  asChild
                  size="sm"
                  className="bg-[#ff5c00] bg-none font-medium shadow-[0_10px_24px_-10px_rgba(255,92,0,0.7)] hover:bg-[#e65300]"
                >
                  <Link href={getPrivateHomePath(user)}>
                    Open app
                    <MaterialIcon name="arrow_forward" size={16} />
                  </Link>
                </GlassButton>
              ) : (
                <>
                  <GlassButton
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-[#ff5c00] font-medium text-[#ff5c00] hover:border-[#e65300] hover:bg-[#ffefe6] hover:text-[#e65300]"
                  >
                    <Link href="/login">Login</Link>
                  </GlassButton>
                  <GlassButton
                    asChild
                    size="sm"
                    className="bg-[#ff5c00] bg-none font-medium shadow-[0_10px_24px_-10px_rgba(255,92,0,0.7)] hover:bg-[#e65300]"
                  >
                    <Link href="/register">Register</Link>
                  </GlassButton>
                </>
              )}
            </div>
          </nav>

          <button
            type="button"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-[#475569] transition-colors hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <MaterialIcon name={mobileOpen ? "close" : "menu"} size={22} />
          </button>
        </div>

        {mobileOpen ? (
          <nav
            className="flex flex-col gap-1 border-t border-gray-200 pt-3 pb-4 lg:hidden"
            aria-label="Mobile"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-[13px] font-medium tracking-normal transition-colors",
                  pathname === link.href
                    ? "bg-[#ff5c00]/10 text-[#ff5c00]"
                    : "text-[#0f172a]/80 hover:bg-gray-100 hover:text-[#ff5c00]",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-3">
              {isAuthenticated ? (
                <GlassButton
                  asChild
                  size="md"
                  className="bg-[#ff5c00] bg-none font-medium hover:bg-[#e65300]"
                >
                  <Link
                    href={getPrivateHomePath(user)}
                    onClick={() => setMobileOpen(false)}
                  >
                    Open app
                  </Link>
                </GlassButton>
              ) : (
                <>
                  <GlassButton
                    asChild
                    variant="outline"
                    size="md"
                    className="border-[#ff5c00] font-medium text-[#ff5c00] hover:border-[#e65300] hover:bg-[#ffefe6] hover:text-[#e65300]"
                  >
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      Login
                    </Link>
                  </GlassButton>
                  <GlassButton
                    asChild
                    size="md"
                    className="bg-[#ff5c00] bg-none font-medium hover:bg-[#e65300]"
                  >
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      Register
                    </Link>
                  </GlassButton>
                </>
              )}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
