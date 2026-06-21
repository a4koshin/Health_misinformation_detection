"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { AuthModal } from "@/components/auth/AuthModal";
import {
  AuthDivider,
  AuthError,
  AuthPillInput,
  AuthPrimaryButton,
  AuthSocialButtons,
} from "@/components/auth/AuthModalParts";
import { useAuth } from "@/store/auth-store";
import { ApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleEmailContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setStep("password");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthModal>
      {step === "email" ? (
        <form onSubmit={handleEmailContinue}>
          <AuthSocialButtons
            onUnavailable={() =>
              setNotice("Social login is not available yet. Use email instead.")
            }
          />
          {notice ? <p className="mt-3 text-center text-sm text-[#b4b4b4]">{notice}</p> : null}
          <AuthDivider />
          {error ? <AuthError message={error} /> : null}
          <AuthPillInput
            id="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <AuthPrimaryButton type="submit">Continue</AuthPrimaryButton>
          <p className="mt-4 text-center text-sm text-[#b4b4b4]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
              setPassword("");
            }}
            className="mb-4 flex items-center gap-1 text-sm text-[#b4b4b4] transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
          <p className="mb-4 text-center text-sm text-[#b4b4b4]">{email}</p>
          {error ? <AuthError message={error} /> : null}
          <AuthPillInput
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            autoFocus
          />
          <AuthPrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Continue"}
          </AuthPrimaryButton>
        </form>
      )}
    </AuthModal>
  );
}
