"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  AuthFieldLabel,
  AuthFooterLink,
  AuthLayout,
} from "@/components/auth/auth-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError, resetPasswordRequest } from "@/lib/api";

const inputClassName =
  "h-11 rounded-xl border-gray-200 bg-gray-50 text-[#0f172a] backdrop-blur-xl placeholder:text-[#64748b] hover:bg-gray-100 focus-visible:border-[#ff8a4d] focus-visible:ring-[#ff5c00]/20";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is invalid or missing.");
      toast.error("Reset link is invalid or missing.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      toast.error("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordRequest(token, password);
      toast.success("Password reset successfully.");
      router.replace("/login");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to reset password.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        description="This password reset link is missing or invalid. Request a new one."
        footer={
          <AuthFooterLink
            text="Need a new link?"
            linkText="Forgot password"
            href="/forgot-password"
          />
        }
      >
        <Button asChild className="h-11 w-full">
          <Link href="/forgot-password">Request reset link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Choose a new password for your account."
      footer={
        <AuthFooterLink text="Remember your password?" linkText="Sign in" href="/login" />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <AuthFieldLabel htmlFor="password">New password</AuthFieldLabel>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            className={inputClassName}
          />
        </div>

        <div>
          <AuthFieldLabel htmlFor="confirmPassword">
            Confirm password
          </AuthFieldLabel>
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            className={inputClassName}
          />
          {error ? <FieldError className="mt-2">{error}</FieldError> : null}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full cursor-pointer gap-2 rounded-xl bg-[#ff5c00] text-base font-semibold text-white shadow-[0_12px_28px_-12px_rgba(255,92,0,0.65)] transition-all hover:bg-[#e65300]"
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
          {!isSubmitting ? <MaterialIcon name="arrow_forward" size={20} /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}
