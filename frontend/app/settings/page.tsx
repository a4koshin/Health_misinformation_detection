"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PasswordInput } from "@/components/auth/password-input";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassInput, GlassLabel } from "@/components/glass/glass-input";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { displayRoleLabel, roleBadgeTone } from "@/lib/roles";
import {
  changePassword,
  getProfile,
  requestAccountDeletion,
  resolveAvatarUrl,
  updateProfile,
  uploadAvatar,
  wipeDatabase,
} from "@/lib/settings";
import { getDisplayName, getInitials } from "@/lib/user";
import { validateEmailAddress, validateFullName } from "@/lib/user-validation";
import { cn } from "@/lib/utils";
import { useAuth, useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { UserProfile } from "@/types/api";

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassCard strong className={cn("overflow-hidden p-0", className)}>
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-base font-semibold text-[#0f172a]">{title}</h2>
        <p className="mt-1 text-sm text-[#64748b]">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </GlassCard>
  );
}

function ActionRow({
  title,
  description,
  buttonLabel,
  onClick,
  destructive = false,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <GlassCard strong className="px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#0f172a]">{title}</p>
          <p className="mt-1 text-sm text-[#64748b]">{description}</p>
        </div>
        <GlassButton
          type="button"
          variant={destructive ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "shrink-0",
            destructive && "bg-red-600 text-white hover:bg-red-700",
          )}
          onClick={onClick}
        >
          {buttonLabel}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function SettingsContent() {
  const { token, user } = useAuth();
  const startNewChat = useChatStore((state) => state.startNewChat);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);


  const [accountConfirmOpen, setAccountConfirmOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wipePassword, setWipePassword] = useState("");
  const [isWipingDatabase, setIsWipingDatabase] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getProfile(token);
        if (!active) return;
        setProfile(data);
        setName(data.name ?? "");
        setEmail(data.email);
        setAvatarPreview(resolveAvatarUrl(data.avatar_url));
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to load settings.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  function handleAvatarPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be 2MB or smaller.");
      return;
    }
    setPendingAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function closeProfileEditor() {
    setEditingProfile(false);
    setPendingAvatar(null);
    setName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
    setAvatarPreview(resolveAvatarUrl(profile?.avatar_url));
  }

  function closePasswordEditor() {
    setEditingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const nameError = validateFullName(name);
    const emailError = validateEmailAddress(email);
    if (nameError || emailError) {
      toast.error(nameError || emailError);
      return;
    }

    setIsSavingProfile(true);
    try {
      let nextAvatar = profile?.avatar_url ?? null;
      if (pendingAvatar) {
        const avatarResult = await uploadAvatar(token, pendingAvatar);
        nextAvatar = avatarResult.avatar_url ?? null;
        setAvatarPreview(resolveAvatarUrl(nextAvatar));
        setPendingAvatar(null);
      }

      const updated = await updateProfile(token, {
        name: name.trim(),
        email: email.trim(),
      });

      const nextProfile: UserProfile = {
        name: (updated.name ?? name.trim()) || null,
        email: updated.email ?? email.trim(),
        avatar_url: nextAvatar ?? updated.avatar_url ?? null,
        language_preference: profile?.language_preference ?? "so",
        deletion_requested_at: profile?.deletion_requested_at,
        is_active: profile?.is_active,
      };
      setProfile(nextProfile);

      if (user) {
        useAuthStore.setState({
          user: {
            ...user,
            email: nextProfile.email,
            full_name: nextProfile.name,
            avatar_url: nextProfile.avatar_url,
          },
        });
      }

      setEditingProfile(false);
      toast.success(updated.message || "Profile updated.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to save profile.";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const result = await changePassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      closePasswordEditor();
      toast.success(result.message || "Password updated.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to update password.";
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token) return;
    if (!accountPassword.trim()) {
      toast.error("Enter your password to confirm.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await requestAccountDeletion(token, {
        password: accountPassword,
      });
      setAccountConfirmOpen(false);
      setAccountPassword("");
      setProfile((current) =>
        current
          ? {
              ...current,
              deletion_requested_at:
                result.deletion_requested_at ?? new Date().toISOString(),
            }
          : current,
      );
      toast.success(
        result.message ||
          "Deletion request sent. An admin will review it.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to request account deletion.";
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  }

  async function handleWipeDatabase() {
    if (!token) return;
    if (!wipePassword.trim()) {
      toast.error("Enter your password to confirm.");
      return;
    }

    setIsWipingDatabase(true);
    try {
      const result = await wipeDatabase(token, {
        password: wipePassword,
      });
      setWipeConfirmOpen(false);
      setWipePassword("");
      startNewChat();
      useChatStore.setState((state) => ({
        historyRevision: state.historyRevision + 1,
      }));
      toast.success(result.message || "Database wiped.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to wipe the database.";
      toast.error(message);
    } finally {
      setIsWipingDatabase(false);
    }
  }

  const initials = user
    ? getInitials(user)
    : (name || email || "U").slice(0, 2).toUpperCase();
  const displayName = user
    ? getDisplayName(user)
    : name.trim() || email || "Account";

  return (
    <PrivatePage
      title="Account"
      description="Manage your profile, password, and account settings."
    >
      {isLoading ? (
        <div className="w-full space-y-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-3xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-5">
          <GlassCard strong className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#ff5c00] text-lg font-semibold text-white">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    {initials}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-medium text-[#0f172a]">
                    {displayName}
                  </p>
                  {user ? (
                    <GlassBadge tone={roleBadgeTone(user.role)}>
                      {displayRoleLabel(user.role)}
                    </GlassBadge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-[#64748b]">
                  {email || user?.email}
                </p>
              </div>
            </div>
          </GlassCard>

          {editingProfile ? (
            <SectionCard
              title="Profile"
              description="Update your name, email, and profile photo."
            >
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[#ff5c00] text-lg font-semibold text-white"
                    aria-label="Upload avatar"
                  >
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="size-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[10px] font-medium">
                      Edit
                    </span>
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0f172a]">
                      Profile photo
                    </p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      JPG, PNG, GIF, or WebP. Max 2MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        handleAvatarPick(event.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <GlassLabel htmlFor="settings-name">Full name</GlassLabel>
                    <GlassInput
                      id="settings-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your full name"
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <GlassLabel htmlFor="settings-email">Email</GlassLabel>
                    <GlassInput
                      id="settings-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <GlassButton type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving…" : "Save changes"}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="ghost"
                    disabled={isSavingProfile}
                    onClick={closeProfileEditor}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            </SectionCard>
          ) : (
            <ActionRow
              title="Profile"
              description="Update your name, email, and profile photo."
              buttonLabel="Edit profile"
              onClick={() => setEditingProfile(true)}
            />
          )}

          {editingPassword ? (
            <SectionCard
              title="Change password"
              description="Use a strong password you do not reuse elsewhere."
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <GlassLabel htmlFor="settings-current-password">
                    Current password
                  </GlassLabel>
                  <PasswordInput
                    id="settings-current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    className="h-11 rounded-xl border-gray-200 bg-white"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <GlassLabel htmlFor="settings-new-password">
                      New password
                    </GlassLabel>
                    <PasswordInput
                      id="settings-new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={6}
                      className="h-11 rounded-xl border-gray-200 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <GlassLabel htmlFor="settings-confirm-password">
                      Confirm new password
                    </GlassLabel>
                    <PasswordInput
                      id="settings-confirm-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      required
                      minLength={6}
                      className="h-11 rounded-xl border-gray-200 bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GlassButton type="submit" disabled={isSavingPassword}>
                    {isSavingPassword ? "Updating…" : "Update password"}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="ghost"
                    disabled={isSavingPassword}
                    onClick={closePasswordEditor}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            </SectionCard>
          ) : (
            <ActionRow
              title="Change password"
              description="Use a strong password you do not reuse elsewhere."
              buttonLabel="Change password"
              onClick={() => setEditingPassword(true)}
            />
          )}

          {user ? (
            <SectionCard
              title="Account details"
              description="Read-only details for your HealthAI account."
            >
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <p className="text-sm text-[#64748b]">Role</p>
                  <GlassBadge tone={roleBadgeTone(user.role)}>
                    {displayRoleLabel(user.role)}
                  </GlassBadge>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <p className="text-sm text-[#64748b]">Account ID</p>
                  <p className="font-mono text-sm text-[#0f172a]">#{user.id}</p>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                  <p className="text-sm text-[#64748b]">Joined</p>
                  <p className="text-sm text-[#0f172a]">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {isAdmin ? (
            <ActionRow
              title="Delete all database data"
              description="Permanently erase every prediction, audit log, and non-admin account. Your admin account stays."
              buttonLabel="Wipe database"
              destructive
              onClick={() => {
                setWipePassword("");
                setWipeConfirmOpen(true);
              }}
            />
          ) : null}

          {!isAdmin ? (
            profile?.deletion_requested_at ? (
              <GlassCard strong className="px-6 py-5">
                <p className="text-sm font-medium text-[#0f172a]">
                  Deletion requested
                </p>
                <p className="mt-1 text-sm text-[#64748b]">
                  An admin will review this request and deactivate the account.
                  You can keep using the app until then.
                </p>
              </GlassCard>
            ) : (
              <ActionRow
                title="Request account deletion"
                description="Ask an admin to deactivate your account. Your data stays until they approve."
                buttonLabel="Request deletion"
                destructive
                onClick={() => {
                  setAccountPassword("");
                  setAccountConfirmOpen(true);
                }}
              />
            )
          ) : null}
        </div>
      )}
      <DialogPrimitive.Root
        open={accountConfirmOpen}
        onOpenChange={(open) => {
          if (isDeletingAccount) return;
          setAccountConfirmOpen(open);
          if (!open) setAccountPassword("");
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <DialogPrimitive.Close
              disabled={isDeletingAccount}
              className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#94a3b8] hover:bg-gray-100"
              aria-label="Close dialog"
            >
              <MaterialIcon name="close" size={20} />
            </DialogPrimitive.Close>

            <div className="flex flex-col items-center pt-4 text-center">
              <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <MaterialIcon name="person_off" size={30} />
              </span>
              <DialogPrimitive.Title className="text-lg font-semibold text-[#111827]">
                Request account deletion?
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm text-[#6b7280]">
                Re-enter your password. An admin must approve this before the
                account is deactivated.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 space-y-2 text-left">
              <GlassLabel htmlFor="delete-account-password">Password</GlassLabel>
              <PasswordInput
                id="delete-account-password"
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
                required
                className="h-11 rounded-xl border-gray-200 bg-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setAccountConfirmOpen(false)}
                className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-[#374151] hover:bg-gray-50 disabled:opacity-50"
              >
                No, cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || !accountPassword.trim()}
                onClick={() => void handleDeleteAccount()}
                className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingAccount ? "Sending…" : "Yes, request it"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={wipeConfirmOpen}
        onOpenChange={(open) => {
          if (isWipingDatabase) return;
          setWipeConfirmOpen(open);
          if (!open) setWipePassword("");
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <DialogPrimitive.Close
              disabled={isWipingDatabase}
              className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#94a3b8] hover:bg-gray-100"
              aria-label="Close dialog"
            >
              <MaterialIcon name="close" size={20} />
            </DialogPrimitive.Close>

            <div className="flex flex-col items-center pt-4 text-center">
              <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <MaterialIcon name="database" size={30} />
              </span>
              <DialogPrimitive.Title className="text-lg font-semibold text-[#111827]">
                Wipe all database data?
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm text-[#6b7280]">
                This deletes every prediction, audit log, and non-admin account.
                Your admin account stays. Re-enter your password to confirm.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-5 space-y-2 text-left">
              <GlassLabel htmlFor="wipe-database-password">Password</GlassLabel>
              <PasswordInput
                id="wipe-database-password"
                value={wipePassword}
                onChange={(event) => setWipePassword(event.target.value)}
                required
                className="h-11 rounded-xl border-gray-200 bg-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isWipingDatabase}
                onClick={() => setWipeConfirmOpen(false)}
                className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-[#374151] hover:bg-gray-50 disabled:opacity-50"
              >
                No, cancel
              </button>
              <button
                type="button"
                disabled={isWipingDatabase || !wipePassword.trim()}
                onClick={() => void handleWipeDatabase()}
                className="h-10 min-w-[8.5rem] cursor-pointer rounded-lg bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isWipingDatabase ? "Wiping…" : "Yes, wipe everything"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </PrivatePage>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <SettingsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
