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

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<"email" | "details">("email");
  const [fullName, setFullName] = useState("");
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
    setStep("details");
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register({
        email,
        full_name: fullName || undefined,
        password,
      });
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
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
            Already have an account?{" "}
            <Link href="/login" className="text-white underline underline-offset-2">
              Log in
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError("");
            }}
            className="mb-4 flex items-center gap-1 text-sm text-[#b4b4b4] transition-colors hover:text-white"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
          <p className="mb-4 text-center text-sm text-[#b4b4b4]">{email}</p>
          {error ? <AuthError message={error} /> : null}
          <div className="space-y-3">
            <AuthPillInput
              id="fullName"
              type="text"
              placeholder="Full name (optional)"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
            />
            <AuthPillInput
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <AuthPrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Continue"}
          </AuthPrimaryButton>
        </form>
      )}
    </AuthModal>
  );
}
