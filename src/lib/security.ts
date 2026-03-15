import type { NextRequest } from "next/server";

function getExpectedOrigin(request: Request | NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;

  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

export function isSameOriginRequest(request: Request | NextRequest): boolean {
  const expectedOrigin = getExpectedOrigin(request);
  if (!expectedOrigin) return false;

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      return new URL(originHeader).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}

export function sanitizeNextPath(next: string | null): string {
  if (!next) return "/";

  const candidate = next.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  if (candidate.includes("\\")) {
    return "/";
  }

  try {
    const parsed = new URL(candidate, "http://local");
    if (parsed.origin !== "http://local") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
