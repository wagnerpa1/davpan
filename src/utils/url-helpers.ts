import { headers } from "next/headers";

const LOCAL_FALLBACK_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `${
        candidate.includes("localhost") || candidate.includes("127.0.0.1")
          ? "http"
          : "https"
      }://${candidate}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function toBaseUrl(origin: string): string {
  return `${origin}/`;
}

export function getURL() {
  const origin =
    normalizeOrigin(process.env.SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_VERCEL_URL) ||
    LOCAL_FALLBACK_ORIGIN;

  return toBaseUrl(origin);
}

export async function getServerURL() {
  const configuredOrigin =
    normalizeOrigin(process.env.SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const requestOrigin = host ? normalizeOrigin(`${protocol}://${host}`) : null;

  return requestOrigin || LOCAL_FALLBACK_ORIGIN;
}
