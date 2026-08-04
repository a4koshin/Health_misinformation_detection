import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={LOGO_SRC}
      alt="SomAI"
      width={1536}
      height={1024}
      priority
      className={cn("h-12 w-auto object-contain object-left sm:h-14 md:h-16", className)}
    />
  );
}

export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="SomAI home"
    >
      <LogoMark />
    </Link>
  );
}
