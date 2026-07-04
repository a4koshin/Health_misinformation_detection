"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { ApiError, forgotPasswordRequest } from "@/lib/api";

const inputClassName =
  "h-11 border-border bg-white text-foreground placeholder:text-muted-foreground";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      await forgotPasswordRequest(email.trim());
      setIsSubmitted(true);
      toast.success("Check your email for reset instructions.");
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
        title="Check your email"
        description="If an account exists for that address, we sent password reset instructions to your inbox."
        backHref="/login"
        footer={
          <AuthFooterLink text="Remember your password?" linkText="Sign in" href="/login" />
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Did not receive anything? Try again with the same email or contact
            support.
          </p>
          <Button asChild className="h-11 w-full">
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
          className="h-11 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}
