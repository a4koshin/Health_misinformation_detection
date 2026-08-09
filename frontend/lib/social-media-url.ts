const SOCIAL_MEDIA_HOSTS = [
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "fb.com",
  "fb.watch",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "threads.net",
] as const;

export const SOCIAL_LINK_EMPTY_MESSAGE =
  "Paste a Facebook, YouTube, or other social media link.";
export const SOCIAL_LINK_INVALID_MESSAGE =
  "Only Facebook, YouTube, TikTok, Instagram, X, or Threads links are allowed.";

function normalizeHost(host: string) {
  const lower = host.toLowerCase().replace(/\.$/, "");
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

function isSocialHost(host: string) {
  const normalized = normalizeHost(host);
  return SOCIAL_MEDIA_HOSTS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

export function validateSocialMediaUrl(raw: string): {
  ok: boolean;
  message?: string;
} {
  const url = (raw || "").trim();
  if (!url) {
    return { ok: false, message: SOCIAL_LINK_EMPTY_MESSAGE };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: SOCIAL_LINK_INVALID_MESSAGE };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      message: "The link must start with http:// or https://.",
    };
  }

  if (!isSocialHost(parsed.hostname)) {
    return { ok: false, message: SOCIAL_LINK_INVALID_MESSAGE };
  }

  return { ok: true };
}
