"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PasswordInput } from "@/components/auth/password-input";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import {
  GlassInput,
  GlassLabel,
  GlassSelect,
} from "@/components/glass/glass-input";
import { GlassModal } from "@/components/glass/glass-modal";
import {
  GlassTable,
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth-store";
import type { User, UserRole } from "@/types/api";

type UserFormState = {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserFormState = {
  email: "",
  full_name: "",
  password: "",
  role: "user",
};

function UsersContent() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  async function loadUsers() {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listUsers(token);
      setUsers(data);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to load users.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [token]);

  function openCreateForm() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(user: User) {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name ?? "",
      password: "",
      role: user.role,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSaving(true);
    try {
      if (editingUser) {
        await updateUser(token, editingUser.id, {
          email: form.email.trim(),
          full_name: form.full_name.trim() || null,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("User updated.");
      } else {
        if (!form.password) {
          toast.error("Password is required.");
          return;
        }
        await createUser(token, {
          email: form.email.trim(),
          full_name: form.full_name.trim() || null,
          password: form.password,
          role: form.role,
        });
        toast.success("User created.");
      }
      closeForm();
      await loadUsers();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to save user.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!token) return;
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(`Delete ${user.email}?`);
    if (!confirmed) return;

    try {
      await deleteUser(token, user.id);
      toast.success("User deleted.");
      await loadUsers();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to delete user.";
      toast.error(message);
    }
  }

  return (
    <PrivatePage
      title="Users"
      description="Create, update, and remove user accounts."
      actions={
        <GlassButton type="button" size="sm" onClick={openCreateForm}>
          <MaterialIcon name="person_add" size={18} />
          Add user
        </GlassButton>
      }
    >
      <GlassModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={editingUser ? "Edit user" : "Create user"}
        description={
          editingUser
            ? `Update the account for ${editingUser.email}.`
            : "Add a new account to the platform."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <GlassLabel htmlFor="user-email">Email</GlassLabel>
              <GlassInput
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="user-name">Full name</GlassLabel>
              <GlassInput
                id="user-name"
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="user-password">
                {editingUser ? "New password (optional)" : "Password"}
              </GlassLabel>
              <PasswordInput
                id="user-password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className="h-11 rounded-2xl border-gray-200 bg-gray-50 backdrop-blur-xl"
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="user-role">Role</GlassLabel>
              <GlassSelect
                id="user-role"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </GlassSelect>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <GlassButton type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingUser ? "Update user" : "Create user"}
            </GlassButton>
            <GlassButton type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {isLoading ? (
        <div className="glass-strong space-y-3 rounded-3xl p-5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="glass-strong flex flex-col items-center gap-2 rounded-3xl px-4 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
            <MaterialIcon name="group" size={24} />
          </span>
          <p className="text-sm font-medium text-[#0f172a]">No users found</p>
          <p className="text-sm text-[#475569]">
            Create the first account with the button above.
          </p>
        </div>
      ) : (
        <GlassTable>
          <GlassTableHead>
            <tr>
              <GlassTableHeaderCell>Name</GlassTableHeaderCell>
              <GlassTableHeaderCell>Email</GlassTableHeaderCell>
              <GlassTableHeaderCell>Role</GlassTableHeaderCell>
              <GlassTableHeaderCell>Actions</GlassTableHeaderCell>
            </tr>
          </GlassTableHead>
          <GlassTableBody>
            {users.map((user) => (
              <GlassTableRow key={user.id}>
                <GlassTableCell className="font-medium">
                  {user.full_name || "—"}
                </GlassTableCell>
                <GlassTableCell>{user.email}</GlassTableCell>
                <GlassTableCell>
                  <GlassBadge tone={user.role === "admin" ? "brand" : "neutral"}>
                    {user.role}
                  </GlassBadge>
                </GlassTableCell>
                <GlassTableCell>
                  <div className="flex gap-2">
                    <GlassButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(user)}
                    >
                      Edit
                    </GlassButton>
                    <GlassButton
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDelete(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </GlassButton>
                  </div>
                </GlassTableCell>
              </GlassTableRow>
            ))}
          </GlassTableBody>
        </GlassTable>
      )}
    </PrivatePage>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <UsersContent />
      </AppShell>
    </ProtectedRoute>
  );
}
