"use client";

import { Phone } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

type AuthSocialButtonsProps = {
  onUnavailable: () => void;
};

export function AuthSocialButtons({ onUnavailable }: AuthSocialButtonsProps) {
  const buttons = [
    { label: "Continue with Google", icon: <GoogleIcon /> },
    { label: "Continue with Apple", icon: <AppleIcon /> },
    { label: "Continue with phone", icon: <Phone className="size-5 text-white" /> },
  ];

  return (
    <div className="space-y-3">
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          onClick={onUnavailable}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#424242] bg-transparent px-4 text-sm font-medium text-white transition-colors hover:bg-[#2f2f2f]"
        >
          {button.icon}
          {button.label}
        </button>
      ))}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#424242]" />
      <span className="text-xs font-medium uppercase tracking-wide text-[#8e8e8e]">
        or
      </span>
      <div className="h-px flex-1 bg-[#424242]" />
    </div>
  );
}

export function AuthPillInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-full border border-[#424242] bg-black px-4 text-sm text-white outline-none placeholder:text-[#8e8e8e] focus:border-[#6b6b6b] ${className ?? ""}`}
    />
  );
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
      {message}
    </p>
  );
}
