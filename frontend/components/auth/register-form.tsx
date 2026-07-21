"use client";

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
import { useAuth, useAuthStore } from "@/store/auth-store";




const inputClassName =
  "h-11 rounded-xl border-gray-200 bg-gray-50 text-[#0f172a] backdrop-blur-xl placeholder:text-[#64748b] hover:bg-gray-100 focus-visible:border-[#ff8a4d] focus-visible:ring-[#ff5c00]/20";

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email, and password are required.");
      toast.error("Full name, email, and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      toast.error("Password must be at least 8 characters.");
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
      });
      toast.success("Account created successfully!");
      const role = useAuthStore.getState().user?.role;
      router.replace(role === "admin" ? "/dashboard" : "/chat");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to create account.";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Sign up below to start detecting health misinformation."
      footer={
        <AuthFooterLink
          text="Already have an account?"
          linkText="Sign in"
          href="/login"
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <AuthFieldLabel htmlFor="fullName">Full name</AuthFieldLabel>
          <Input
            id="fullName"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
            className={inputClassName}
          />
        </div>

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
          <AuthFieldLabel htmlFor="password">Password</AuthFieldLabel>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            className={inputClassName}
          />
          {error ? <FieldError className="mt-2">{error}</FieldError> : null}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full cursor-pointer gap-2 rounded-xl bg-[#ff5c00] text-base font-semibold text-white shadow-[0_12px_28px_-12px_rgba(255,92,0,0.65)] transition-all hover:bg-[#e65300]"
        >
          {isLoading ? "Creating account..." : "Create account"}
          {!isLoading ? <MaterialIcon name="arrow_forward" size={20} /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}
