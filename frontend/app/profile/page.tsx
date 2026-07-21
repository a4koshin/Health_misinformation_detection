"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { GlassInput, GlassLabel } from "@/components/glass/glass-input";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { ApiError, updateCurrentUser } from "@/lib/api";
import { useAuth, useAuthStore } from "@/store/auth-store";

function ProfileContent() {
  const { user, token } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) return;

    setIsSaving(true);
    try {
      const updated = await updateCurrentUser(token, {
        email: email.trim(),
        full_name: fullName.trim() || null,
      });
      useAuthStore.setState({ user: updated });
      toast.success("Profile updated.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to update profile.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PrivatePage
      title="Profile"
      description="Update your account details."
    >
      <form
        onSubmit={handleSubmit}
        className="glass-strong max-w-xl space-y-5 rounded-3xl p-7"
      >
        <div className="space-y-2">
          <GlassLabel htmlFor="fullName">Full name</GlassLabel>
          <GlassInput
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-2">
          <GlassLabel htmlFor="email">Email</GlassLabel>
          <GlassInput
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-[#475569]">
          Account role
          <GlassBadge tone={user?.role === "admin" ? "brand" : "neutral"}>
            {user?.role}
          </GlassBadge>
        </div>

        <GlassButton type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </GlassButton>
      </form>
    </PrivatePage>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileContent />
      </AppShell>
    </ProtectedRoute>
  );
}
