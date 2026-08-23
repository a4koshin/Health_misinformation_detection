"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PasswordInput } from "@/components/auth/password-input";
import { GlassButton } from "@/components/glass/glass-button";
import { DeleteAlertModal } from "@/components/glass/delete-alert-modal";
import { GlassInput, GlassLabel } from "@/components/glass/glass-input";
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
  ViewDetailsButton,
  ViewDetailsModal,
} from "@/components/glass/view-details-modal";
import {
  TablePagination,
  useTablePagination,
} from "@/components/glass/table-pagination";
import { AppShell } from "@/components/layout/app-shell";
import { PrivatePage } from "@/components/layout/private-page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MaterialIcon } from "@/components/ui/material-icon";
import {
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
} from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { resolveAvatarUrl } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { validateEmailAddress, validateFullName } from "@/lib/user-validation";
import { useAuth } from "@/store/auth-store";
import type { DoctorProfile } from "@/types/api";

type DoctorFormState = {
  name: string;
  email: string;
  password: string;
  job_title: string;
  workplace: string;
  licenseFile: File | null;
  profileFile: File | null;
};

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  job_title?: string;
  workplace?: string;
  licenseFile?: string;
  profileFile?: string;
};

const emptyForm: DoctorFormState = {
  name: "",
  email: "",
  password: "",
  job_title: "",
  workplace: "",
  licenseFile: null,
  profileFile: null,
};

function isImagePath(url: string | null | undefined) {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

const PROFILE_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";
const LICENSE_ACCEPT = "application/pdf,.pdf";
const PROFILE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
]);
const LICENSE_EXTENSIONS = new Set([".pdf"]);

function fileExtension(file: File) {
  const name = file.name || "";
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function validateProfileImageFile(file: File | null): string | undefined {
  if (!file) return undefined;
  const extension = fileExtension(file);
  const mime = (file.type || "").toLowerCase();
  const mimeOk = !mime || mime.startsWith("image/");
  if (!PROFILE_EXTENSIONS.has(extension) || !mimeOk) {
    return "Profile image must be JPG, PNG, GIF, or WebP.";
  }
  return undefined;
}

function validateLicenseDocumentFile(file: File | null): string | undefined {
  if (!file) return undefined;
  const extension = fileExtension(file);
  const mime = (file.type || "").toLowerCase();
  const mimeOk = !mime || mime === "application/pdf";
  if (!LICENSE_EXTENSIONS.has(extension) || !mimeOk) {
    return "License must be a PDF document (images are not allowed).";
  }
  return undefined;
}

function FileField({
  id,
  label,
  accept,
  required,
  error,
  previewUrl,
  fileName,
  hint,
  variant = "document",
  validate,
  onReject,
  onChange,
}: {
  id: string;
  label: string;
  accept: string;
  required?: boolean;
  error?: string;
  previewUrl?: string | null;
  fileName?: string | null;
  hint?: string;
  variant?: "profile" | "document";
  validate?: (file: File) => string | undefined;
  onReject?: (message: string) => void;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = Boolean(previewUrl && isImagePath(previewUrl));
  const hasValue = Boolean(previewUrl || fileName);

  function clearFile() {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <GlassLabel htmlFor={id}>
        {label}
        {required ? "" : " (optional)"}
      </GlassLabel>
      <div className="relative">
        <label
          htmlFor={id}
          aria-invalid={Boolean(error)}
          className={cn(
            "group relative flex w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed px-4 py-5 text-center transition-[border-color,background-color,box-shadow] duration-200",
            "border-gray-200 bg-[#fafafa] hover:border-[#ff5c00]/45 hover:bg-[#ffefe6]/35",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-[#ff5c00]/25",
            hasValue &&
              "border-solid border-gray-200 bg-white hover:border-[#ff5c00]/35",
            error && "border-red-300 bg-red-50/50 hover:border-red-400",
          )}
        >
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl!}
              alt=""
              className={cn(
                "object-cover shadow-sm ring-1 ring-black/5",
                variant === "profile"
                  ? "size-16 rounded-full"
                  : "h-16 w-24 rounded-xl",
              )}
            />
          ) : previewUrl ? (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#ffefe6] text-[#ff5c00]">
              <MaterialIcon name="description" size={24} />
            </span>
          ) : (
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#ff5c00] shadow-sm ring-1 ring-black/[0.04] transition-transform duration-200 group-hover:scale-[1.03]">
              <MaterialIcon
                name={variant === "profile" ? "person" : "badge"}
                size={22}
              />
            </span>
          )}

          <span className="min-w-0 space-y-0.5">
            <span className="block text-sm font-medium text-[#0f172a]">
              {hasValue ? "Replace file" : "Click to upload"}
            </span>
            <span className="block truncate text-xs text-[#64748b]">
              {fileName || hint || "JPG, PNG, or WebP"}
            </span>
          </span>

          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && validate) {
                const typeError = validate(file);
                if (typeError) {
                  toast.error(typeError);
                  if (inputRef.current) inputRef.current.value = "";
                  onReject?.(typeError);
                  return;
                }
              }
              onChange(file);
            }}
          />
        </label>

        {hasValue ? (
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-2.5 right-2.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-white text-[#64748b] shadow-sm ring-1 ring-black/5 transition-colors hover:text-[#ff5c00]"
            aria-label={`Remove ${label}`}
          >
            <MaterialIcon name="close" size={16} />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function DoctorsContent() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DoctorProfile | null>(null);
  const [detailDoctor, setDetailDoctor] = useState<DoctorProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<DoctorFormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const pagination = useTablePagination(doctors, 10);

  async function loadDoctors() {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await listDoctors(token);
      setDoctors(data);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to load doctors.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDoctors();
  }, [token]);

  useEffect(() => {
    if (!form.licenseFile) return;
    const url = URL.createObjectURL(form.licenseFile);
    setLicensePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.licenseFile]);

  useEffect(() => {
    if (!form.profileFile) return;
    const url = URL.createObjectURL(form.profileFile);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.profileFile]);

  function openCreateForm() {
    setEditingDoctor(null);
    setForm(emptyForm);
    setFormErrors({});
    setLicensePreview(null);
    setProfilePreview(null);
    setShowForm(true);
  }

  function openEditForm(doctor: DoctorProfile) {
    setEditingDoctor(doctor);
    setForm({
      name: doctor.name || doctor.full_name || "",
      email: doctor.email || "",
      password: "",
      job_title: doctor.job_title || "",
      workplace: doctor.workplace || "",
      licenseFile: null,
      profileFile: null,
    });
    setLicensePreview(
      resolveAvatarUrl(doctor.license_url || doctor.license),
    );
    setProfilePreview(
      resolveAvatarUrl(
        doctor.profile_image_url || doctor.profile_image || doctor.avatar_url,
      ),
    );
    setFormErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingDoctor(null);
    setForm(emptyForm);
    setFormErrors({});
    setLicensePreview(null);
    setProfilePreview(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const nameError = validateFullName(form.name);
    const emailError = validateEmailAddress(form.email);
    const passwordError =
      !editingDoctor && !form.password
        ? "Password is required."
        : form.password && form.password.length < 6
          ? "Password must be at least 6 characters."
          : undefined;
    const titleError = !form.job_title.trim() ? "Job title is required." : undefined;
    const workplaceError = !form.workplace.trim()
      ? "Workplace is required."
      : undefined;
    const needsLicense =
      !editingDoctor ||
      !(editingDoctor.license_url || editingDoctor.license);
    const needsProfile =
      !editingDoctor ||
      !(
        editingDoctor.profile_image_url ||
        editingDoctor.profile_image ||
        editingDoctor.avatar_url
      );
    const licenseError =
      needsLicense && !form.licenseFile
        ? "License PDF document is required."
        : validateLicenseDocumentFile(form.licenseFile);
    const profileError =
      needsProfile && !form.profileFile
        ? "Profile image is required."
        : validateProfileImageFile(form.profileFile);

    const nextErrors: FormErrors = {
      ...(nameError ? { name: nameError } : {}),
      ...(emailError ? { email: emailError } : {}),
      ...(passwordError ? { password: passwordError } : {}),
      ...(titleError ? { job_title: titleError } : {}),
      ...(workplaceError ? { workplace: workplaceError } : {}),
      ...(licenseError ? { licenseFile: licenseError } : {}),
      ...(profileError ? { profileFile: profileError } : {}),
    };
    setFormErrors(nextErrors);
    const firstError =
      nameError ||
      emailError ||
      passwordError ||
      titleError ||
      workplaceError ||
      licenseError ||
      profileError;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    setIsSaving(true);
    try {
      if (editingDoctor) {
        await updateDoctor(token, editingDoctor.id, {
          email: form.email.trim(),
          name: form.name.trim(),
          job_title: form.job_title.trim(),
          workplace: form.workplace.trim(),
          ...(form.password ? { password: form.password } : {}),
          ...(form.licenseFile ? { license: form.licenseFile } : {}),
          ...(form.profileFile ? { profile_image: form.profileFile } : {}),
        });
        toast.success("Doctor updated.");
      } else {
        if (!form.licenseFile || !form.profileFile) {
          toast.error("License and profile image are required.");
          return;
        }
        await createDoctor(token, {
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          job_title: form.job_title.trim(),
          workplace: form.workplace.trim(),
          license: form.licenseFile,
          profile_image: form.profileFile,
        });
        toast.success("Doctor created.");
      }
      closeForm();
      await loadDoctors();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to save doctor.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDoctor() {
    if (!token || !pendingDelete) return;

    setIsDeleting(true);
    try {
      await deleteDoctor(token, pendingDelete.id);
      toast.success("Doctor deleted.");
      setPendingDelete(null);
      await loadDoctors();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to delete doctor.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PrivatePage
      title="Doctors"
      description="Create doctor accounts with profile photo and license PDF."
      actions={
        <GlassButton type="button" size="sm" onClick={openCreateForm}>
          <MaterialIcon name="person_add" size={18} />
          Add doctor
        </GlassButton>
      }
    >
      <GlassModal
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        title={editingDoctor ? "Edit doctor" : "Create doctor"}
        description={
          editingDoctor
            ? `Update the doctor profile for ${editingDoctor.email}.`
            : "Add a doctor account. Upload a profile photo (image) and a license PDF."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <GlassLabel htmlFor="doctor-name">Name</GlassLabel>
              <GlassInput
                id="doctor-name"
                value={form.name}
                aria-invalid={Boolean(formErrors.name)}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  setFormErrors((current) => ({ ...current, name: undefined }));
                }}
              />
              {formErrors.name ? (
                <p className="text-sm text-red-600">{formErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="doctor-email">Email</GlassLabel>
              <GlassInput
                id="doctor-email"
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
              <GlassLabel htmlFor="doctor-title">Job title</GlassLabel>
              <GlassInput
                id="doctor-title"
                value={form.job_title}
                aria-invalid={Boolean(formErrors.job_title)}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    job_title: event.target.value,
                  }));
                  setFormErrors((current) => ({ ...current, job_title: undefined }));
                }}
              />
              {formErrors.job_title ? (
                <p className="text-sm text-red-600">{formErrors.job_title}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <GlassLabel htmlFor="doctor-workplace">Where they work</GlassLabel>
              <GlassInput
                id="doctor-workplace"
                value={form.workplace}
                aria-invalid={Boolean(formErrors.workplace)}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    workplace: event.target.value,
                  }));
                  setFormErrors((current) => ({ ...current, workplace: undefined }));
                }}
              />
              {formErrors.workplace ? (
                <p className="text-sm text-red-600">{formErrors.workplace}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <div className="mb-3">
                <p className="text-sm font-medium text-[#0f172a]">Documents</p>
                <p className="text-xs text-[#64748b]">
                  Profile photo (image only) and license PDF (document only).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FileField
                  id="doctor-profile"
                  label="Profile image"
                  variant="profile"
                  hint="JPG, PNG, GIF, or WebP"
                  accept={PROFILE_ACCEPT}
                  required={!editingDoctor}
                  error={formErrors.profileFile}
                  previewUrl={profilePreview}
                  fileName={form.profileFile?.name}
                  validate={validateProfileImageFile}
                  onReject={(message) => {
                    setFormErrors((current) => ({
                      ...current,
                      profileFile: message,
                    }));
                  }}
                  onChange={(file) => {
                    setForm((current) => ({ ...current, profileFile: file }));
                    setFormErrors((current) => ({
                      ...current,
                      profileFile: undefined,
                    }));
                    if (!file) {
                      setProfilePreview(
                        editingDoctor
                          ? resolveAvatarUrl(
                              editingDoctor.profile_image_url ||
                                editingDoctor.profile_image ||
                                editingDoctor.avatar_url,
                            )
                          : null,
                      );
                    }
                  }}
                />
                <FileField
                  id="doctor-license"
                  label="License document"
                  variant="document"
                  hint="PDF only"
                  accept={LICENSE_ACCEPT}
                  required={!editingDoctor}
                  error={formErrors.licenseFile}
                  previewUrl={licensePreview}
                  fileName={form.licenseFile?.name}
                  validate={validateLicenseDocumentFile}
                  onReject={(message) => {
                    setFormErrors((current) => ({
                      ...current,
                      licenseFile: message,
                    }));
                  }}
                  onChange={(file) => {
                    setForm((current) => ({ ...current, licenseFile: file }));
                    setFormErrors((current) => ({
                      ...current,
                      licenseFile: undefined,
                    }));
                    if (!file) {
                      setLicensePreview(
                        editingDoctor
                          ? resolveAvatarUrl(
                              editingDoctor.license_url || editingDoctor.license,
                            )
                          : null,
                      );
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <GlassLabel htmlFor="doctor-password">
                {editingDoctor ? "New password (optional)" : "Password"}
              </GlassLabel>
              <PasswordInput
                id="doctor-password"
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
                required={!editingDoctor}
              />
              {formErrors.password ? (
                <p className="text-sm text-red-600">{formErrors.password}</p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <GlassButton type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : editingDoctor
                  ? "Update doctor"
                  : "Create doctor"}
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
            <h2 className="text-base font-semibold text-[#0f172a]">Doctors</h2>
            <p className="text-sm text-[#475569]">
              Professional profiles for the review queue.
            </p>
          </div>
        }
        footer={
          !isLoading && doctors.length > 0 ? (
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
            <GlassTableHeaderCell>Doctor</GlassTableHeaderCell>
            <GlassTableHeaderCell>License</GlassTableHeaderCell>
            <GlassTableHeaderCell>Job title</GlassTableHeaderCell>
            <GlassTableHeaderCell>Workplace</GlassTableHeaderCell>
            <GlassTableHeaderCell>Email</GlassTableHeaderCell>
            <GlassTableHeaderCell className="text-right">
              Actions
            </GlassTableHeaderCell>
          </GlassTableRow>
        </GlassTableHead>
        <GlassTableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <GlassTableRow key={index}>
                <GlassTableCell colSpan={6}>
                  <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
                </GlassTableCell>
              </GlassTableRow>
            ))
          ) : doctors.length === 0 ? (
            <GlassTableRow>
              <GlassTableCell colSpan={6}>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00]/10 text-[#ff5c00]">
                    <MaterialIcon name="medical_services" size={24} />
                  </span>
                  <p className="text-sm font-medium text-[#0f172a]">
                    No doctors yet
                  </p>
                  <p className="text-sm text-[#475569]">
                    Create the first doctor with the button above.
                  </p>
                </div>
              </GlassTableCell>
            </GlassTableRow>
          ) : (
            pagination.pageItems.map((doctor) => {
              const profileSrc = resolveAvatarUrl(
                doctor.profile_image_url ||
                  doctor.profile_image ||
                  doctor.avatar_url,
              );
              const licenseSrc = resolveAvatarUrl(
                doctor.license_url || doctor.license,
              );
              const initials = (doctor.name || "D")
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <GlassTableRow key={doctor.id}>
                  <GlassTableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9 after:border-0">
                        {profileSrc ? (
                          <AvatarImage src={profileSrc} alt={doctor.name} />
                        ) : null}
                        <AvatarFallback className="bg-brand text-[11px] font-medium text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{doctor.name || "—"}</span>
                    </div>
                  </GlassTableCell>
                  <GlassTableCell>
                    {licenseSrc ? (
                      isImagePath(licenseSrc) ? (
                        <a
                          href={licenseSrc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block"
                          title="Open license"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={licenseSrc}
                            alt="License"
                            className="h-10 w-14 rounded-lg border border-gray-200 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={licenseSrc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#ff5c00]"
                        >
                          <MaterialIcon name="description" size={16} />
                          View
                        </a>
                      )
                    ) : (
                      "—"
                    )}
                  </GlassTableCell>
                  <GlassTableCell>{doctor.job_title}</GlassTableCell>
                  <GlassTableCell>{doctor.workplace}</GlassTableCell>
                  <GlassTableCell>{doctor.email || "—"}</GlassTableCell>
                  <GlassTableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ViewDetailsButton onClick={() => setDetailDoctor(doctor)} />
                      <TableEditButton onClick={() => openEditForm(doctor)} />
                      <TableDeleteButton
                        onClick={() => setPendingDelete(doctor)}
                        label={`Delete ${doctor.email || doctor.name}`}
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
        open={Boolean(detailDoctor)}
        onOpenChange={(open) => {
          if (!open) setDetailDoctor(null);
        }}
        title="Doctor details"
        fields={
          detailDoctor
            ? [
                { label: "Name", value: detailDoctor.name },
                { label: "Email", value: detailDoctor.email },
                { label: "Job title", value: detailDoctor.job_title },
                { label: "Workplace", value: detailDoctor.workplace },
                {
                  label: "Status",
                  value:
                    detailDoctor.is_active === false ? "Inactive" : "Active",
                },
                { label: "Created", value: detailDoctor.created_at },
              ]
            : []
        }
      />

      <DeleteAlertModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
        title="Delete this doctor?"
        description={`This permanently deletes ${pendingDelete?.email ?? "this doctor"} and their account.`}
        confirmLabel="Yes, delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteDoctor}
      />
    </PrivatePage>
  );
}

export default function DoctorsPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <AppShell>
        <DoctorsContent />
      </AppShell>
    </ProtectedRoute>
  );
}
