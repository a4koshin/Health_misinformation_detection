"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";

const inputClassName =
  "h-11 border-border bg-white text-foreground placeholder:text-muted-foreground";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      toast.error("Please enter your email and password.");
      return;
    }

    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      router.replace("/chat");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to sign in.";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <AuthLayout
      title="Sign in to your account"
      description="Enter your credentials below to start checking health claims."
      footer={
        <AuthFooterLink
          text="Don't have an account?"
          linkText="Create one"
          href="/register"
        />
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
        </div>

        <div>
          <AuthFieldLabel
            htmlFor="password"
            action={
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Forgot password?
              </Link>
            }
          >
            Password
          </AuthFieldLabel>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className={inputClassName}
          />
          {error ? <FieldError className="mt-2">{error}</FieldError> : null}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full gap-2 bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? "Signing in..." : "Sign in"}
          {!isLoading ? <MaterialIcon name="arrow_forward" size={20} /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}
