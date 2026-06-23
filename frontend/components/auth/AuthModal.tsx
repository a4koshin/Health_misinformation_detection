import Link from "next/link";
import { X, Sparkles } from "lucide-react";

type AuthModalProps = {
  children: React.ReactNode;
};

export function AuthModal({ children }: AuthModalProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="relative w-full max-w-[420px]">
        <div className="rounded-3xl border border-gray-100 bg-white px-7 pb-7 pt-8 shadow-sm">
          <Link
            href="/"
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="size-4" />
          </Link>

          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-black">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                Log in or sign up
              </h1>
              <p className="text-sm leading-relaxed text-gray-400">
                Detect health misinformation in Somali text.
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
