import Link from "next/link";
import { X } from "lucide-react";

type AuthModalProps = {
  children: React.ReactNode;
};

export function AuthModal({ children }: AuthModalProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="relative w-full max-w-[440px] rounded-3xl bg-[#212121] px-6 pb-6 pt-8">
        <Link
          href="/"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-[#ececec] transition-colors hover:bg-[#2f2f2f]"
          aria-label="Close"
        >
          <X className="size-5" />
        </Link>

        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-[28px] font-semibold leading-tight text-white">
            Log in or sign up
          </h1>
          <p className="text-sm leading-relaxed text-[#b4b4b4]">
            Detect health misinformation in Somali text with smarter, reliable
            analysis.
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
