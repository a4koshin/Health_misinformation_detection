const NAME_ALLOWED = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]*[A-Za-zÀ-ÿ]$|^[A-Za-zÀ-ÿ]$/;
const EMAIL_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

function letterCount(value: string) {
  return [...value].filter((char) => /\p{L}/u.test(char)).length;
}

function digitsOnlyName(value: string) {
  return /^\d+$/.test(value.replace(/[ .'-]/g, ""));
}

export function validateFullName(
  name: string,
  { required = true }: { required?: boolean } = {},
): string | null {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return required ? "Full name is required." : null;
  }
  if (cleaned.length < 2) {
    return "Enter a real full name, not a short code.";
  }
  if (digitsOnlyName(cleaned) || letterCount(cleaned) < 2) {
    return "Full name must contain letters, not only numbers.";
  }
  if (!NAME_ALLOWED.test(cleaned)) {
    return "Full name can only include letters, spaces, hyphens, and apostrophes.";
  }
  return null;
}

export function validateEmailAddress(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!value) return "Email is required.";
  if (value.includes("..") || !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }

  const local = value.split("@")[0] ?? "";
  const localCore = local.replace(/[._%+-]/g, "");
  if (/^\d+$/.test(localCore) || letterCount(local) < 2) {
    return "Email must use a real name before @, not only numbers like 123@gmail.com.";
  }
  return null;
}
