"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PasswordInput } from "@/components/auth/password-input";
import { GlassBadge } from "@/components/glass/glass-badge";
import { GlassButton } from "@/components/glass/glass-button";
import { DeleteAlertModal } from "@/components/glass/delete-alert-modal";
import {
  GlassInput,
  GlassLabel,
  GlassSelect,
} from "@/components/glass/glass-input";
import { GlassModal } from "@/components/glass/glass-modal";
import { DataTableCard } from "@/components/glass/data-table-card";
import {
  GlassTableBody,
  GlassTableCell,
  GlassTableHead,
  GlassTableHeaderCell,
  GlassTableRow,
} from "@/components/glass/glass-table";
import {
  TableDeleteButton,
  TableEditButton,
} from "@/components/glass/table-icon-button";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
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
import {
  ASSIGNABLE_ROLES,
  displayRoleLabel,
  roleBadgeTone,
} from "@/lib/roles";
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
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const pagination = useTablePagination(users, 10);

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

  async function handleDelete() {
    if (!token || !pendingDelete) return;
    if (pendingDelete.id === currentUser?.id) {
      toast.error("You cannot delete your own account.");
      setPendingDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser(token, pendingDelete.id);
      toast.success("User deleted.");
      setPendingDelete(null);
      await loadUsers();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to delete user.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
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
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
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

      <DataTableCard
        header={
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">Users</h2>
            <p className="text-sm text-[#475569]">
              Manage accounts, roles, and access across HealthAI.
            </p>
          </div>
        }
        footer={
          !isLoading && users.length > 0 ? (
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              pageNumbers={pagination.pageNumbers}
              onPageChange={pagination.setPage}
              rowsPerPage={pagination.rowsPerPage}
              onRowsPerPageChange={pagination.setRowsPerPage}
            />
          ) : undefined
        }
      >
        <GlassTableHead>
          <GlassTableRow>
            <GlassTableHeaderCell>Name</GlassTableHeaderCell>
            <GlassTableHeaderCell>Email</GlassTableHeaderCell>
            <GlassTableHeaderCell>Role</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Actions
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={4}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : users.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={4}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="group" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No users found
                  </p>
                  <p className="text-sm text-[#475569]">
                    Create the first account with the button above.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((user) => (
              <GlassTableRow key={user.id}>
                <GlassTableCell className="font-medium">
                  {user.full_name || "—"}
                </GlassTableCell>
                <GlassTableCell>{user.email}</GlassTableCell>
                <GlassTableCell>
                  <GlassBadge tone={roleBadgeTone(user.role)}>
                    {displayRoleLabel(user.role)}
                  </GlassBadge>
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TableEditButton onClick={() => openEditForm(user)} />
                    <TableDeleteButton
                      onClick={() => setPendingDelete(user)}
                      disabled={user.id === currentUser?.id}
                    />
                  </div>
                </GlassTableCell>
              </GlassTableRow>
            ))
          )}
        </GlassTableBody>
      </DataTableCard>

      <DeleteAlertModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
        itemLabel={pendingDelete?.email}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
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
