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
  TableEditButton,
  TableIconButton,
} from "@/components/glass/table-icon-button";
import {
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  createUser,
  listUsers,
  setUserActive,
  updateUser,
} from "@/lib/admin";
import { ApiError } from "@/lib/api";
import {
  ASSIGNABLE_ROLES,
  displayRoleLabel,
  roleBadgeTone,
} from "@/lib/roles";
import { validateEmailAddress, validateFullName } from "@/lib/user-validation";
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
  const [pendingToggle, setPendingToggle] = useState<User | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
  }>({});
  const pagination = useTablePagination(users, 10);

  async function loadUsers() {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listUsers(token);
      setUsers(data.filter((item) => item.role !== "doctor"));
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
    setFormErrors({});
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
    setFormErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
    setFormErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const nameError = validateFullName(form.full_name);
    const emailError = validateEmailAddress(form.email);
    const passwordError =
      !editingUser && !form.password
        ? "Password is required."
        : !editingUser && form.password.length < 6
          ? "Password must be at least 6 characters."
          : form.password && form.password.length < 6
            ? "Password must be at least 6 characters."
            : undefined;
    const nextErrors = {
      ...(nameError ? { full_name: nameError } : {}),
      ...(emailError ? { email: emailError } : {}),
      ...(passwordError ? { password: passwordError } : {}),
    };
    setFormErrors(nextErrors);
    if (nameError || emailError || passwordError) {
      toast.error(nameError || emailError || passwordError);
      return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        await updateUser(token, editingUser.id, {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("User updated.");
      } else {
        await createUser(token, {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
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

  async function handleToggleActive() {
    if (!token || !pendingToggle) return;
    if (pendingToggle.id === currentUser?.id) {
      toast.error("You cannot deactivate your own account.");
      setPendingToggle(null);
      return;
    }
    if (pendingToggle.role === "admin") {
      toast.error("Admin accounts cannot be deactivated this way.");
      setPendingToggle(null);
      return;
    }

    const nextActive = pendingToggle.is_active === false;
    setIsTogglingActive(true);
    try {
      const updated = await setUserActive(token, pendingToggle.id, nextActive);
      setUsers((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setPendingToggle(null);
      toast.success(
        nextActive ? "Account activated." : "Account deactivated.",
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to update account status.";
      toast.error(message);
    } finally {
      setIsTogglingActive(false);
    }
  }

  return (
    <PrivatePage
      title="Users"
      description="Create and manage user and admin accounts. Deactivate accounts instead of deleting them. Doctors are managed on the Doctors page."
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
                aria-invalid={Boolean(formErrors.full_name)}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }));
                  setFormErrors((current) => ({ ...current, full_name: undefined }));
                }}
              />
              {formErrors.full_name ? (
                <p className="text-sm text-red-600">{formErrors.full_name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="user-email">Email</GlassLabel>
              <GlassInput
                id="user-email"
                type="email"
                value={form.email}
                aria-invalid={Boolean(formErrors.email)}
                onChange={(event) => {
                  setForm((current) => ({ ...current, email: event.target.value }));
                  setFormErrors((current) => ({ ...current, email: undefined }));
                }}
                required
              />
              {formErrors.email ? (
                <p className="text-sm text-red-600">{formErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="user-password">
                {editingUser ? "New password (optional)" : "Password"}
              </GlassLabel>
              <PasswordInput
                id="user-password"
                value={form.password}
                aria-invalid={Boolean(formErrors.password)}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }));
                  setFormErrors((current) => ({ ...current, password: undefined }));
                }}
                className="h-11 rounded-2xl border-gray-200 bg-gray-50 backdrop-blur-xl"
                required={!editingUser}
              />
              {formErrors.password ? (
                <p className="text-sm text-red-600">{formErrors.password}</p>
              ) : null}
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
              Manage accounts and roles. Deactivated users cannot sign in; their
              data is kept.
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
            <GlassTableHeaderCell>Status</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Actions
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={5}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : users.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={5}>
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
            pagination.pageItems.map((user) => {
              const isActive = user.is_active !== false;
              const requested = Boolean(user.deletion_requested_at);
              const canToggle =
                user.role !== "admin" && user.id !== currentUser?.id;
              return (
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
                <GlassTableCell>
                  {!isActive ? (
                    <GlassBadge tone="danger">Deactivated</GlassBadge>
                  ) : requested ? (
                    <GlassBadge tone="brand">Deletion requested</GlassBadge>
                  ) : (
                    <GlassBadge tone="success">Active</GlassBadge>
                  )}
                </GlassTableCell>
                <GlassTableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ViewDetailsButton onClick={() => setDetailUser(user)} />
                    <TableEditButton onClick={() => openEditForm(user)} />
                    <TableIconButton
                      icon={isActive ? "block" : "check_circle"}
                      tone={isActive ? "danger" : "brand"}
                      onClick={() => setPendingToggle(user)}
                      disabled={
                        !canToggle ||
                        (isTogglingActive && pendingToggle?.id === user.id)
                      }
                      label={
                        !canToggle
                          ? user.role === "admin"
                            ? "Admin accounts cannot be deactivated"
                            : "You cannot deactivate your own account"
                          : isActive
                            ? `Deactivate ${user.email}`
                            : `Activate ${user.email}`
                      }
                    />
                  </div>
                </GlassTableCell>
              </GlassTableRow>
              );
            })
          )}
        </GlassTableBody>
      </DataTableCard>

      <ViewDetailsModal
        open={Boolean(detailUser)}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null);
        }}
        title="User details"
        fields={
          detailUser
            ? [
                { label: "Name", value: detailUser.full_name || "—" },
                { label: "Email", value: detailUser.email },
                { label: "Role", value: displayRoleLabel(detailUser.role) },
                {
                  label: "Status",
                  value:
                    detailUser.is_active === false
                      ? "Deactivated"
                      : detailUser.deletion_requested_at
                        ? "Deletion requested"
                        : "Active",
                },
                { label: "Joined", value: detailUser.created_at },
              ]
            : []
        }
      />

      <DeleteAlertModal
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open && !isTogglingActive) setPendingToggle(null);
        }}
        title={
          pendingToggle?.is_active === false
            ? "Activate this account?"
            : "Deactivate this account?"
        }
        description={
          pendingToggle?.is_active === false
            ? `${pendingToggle.email} will be able to sign in again.`
            : `Users cannot be deleted. Deactivating ${pendingToggle?.email ?? "this account"} blocks sign-in and keeps their history.`
        }
        confirmLabel={
          pendingToggle?.is_active === false
            ? "Yes, activate"
            : "Yes, deactivate"
        }
        isLoading={isTogglingActive}
        onConfirm={handleToggleActive}
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
