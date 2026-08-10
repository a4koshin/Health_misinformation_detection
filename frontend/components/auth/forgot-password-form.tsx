"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  AuthFieldLabel,
  AuthFooterLink,
  AuthLayout,
} from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError, forgotPasswordRequest } from "@/lib/api";

const inputClassName =
  "h-11 rounded-xl border-gray-200 bg-gray-50 text-[#0f172a] backdrop-blur-xl placeholder:text-[#64748b] hover:bg-gray-100 focus-visible:border-[#ff8a4d] focus-visible:ring-[#ff5c00]/20";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      toast.error("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forgotPasswordRequest(email.trim());
      setResetUrl(result.reset_url || null);
      setEmailSent(Boolean(result.email_sent));
      setIsSubmitted(true);
      toast.success(
        result.email_sent
          ? "Check your email for reset instructions."
          : result.reset_url
            ? "Reset link is ready."
            : "If that account exists, follow the next step.",
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to process your request.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout
        title={emailSent ? "Check your email" : "Reset your password"}
        description={
          emailSent
            ? "If an account exists for that address, we sent a reset link to your inbox. You can also use the button below."
            : "Inbox email is not configured yet. If this account exists, use the reset link below."
        }
        backHref="/login"
        footer={
          <AuthFooterLink text="Remember your password?" linkText="Sign in" href="/login" />
        }
      >
        <div className="space-y-4">
          {resetUrl ? (
            <Button asChild className="h-11 w-full">
              <Link href={resetUrl}>Reset password</Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reset link was created. Use a registered email, or ask an
              admin to update your password.
            </p>
          )}
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we will send you instructions to reset your password."
      backHref="/login"
      footer={
        <AuthFooterLink text="Remember your password?" linkText="Sign in" href="/login" />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <AuthFieldLabel htmlFor="email">Email address</AuthFieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
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
          {isSubmitting ? "Sending..." : "Send reset link"}
          {!isSubmitting ? <MaterialIcon name="arrow_forward" size={20} /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}
