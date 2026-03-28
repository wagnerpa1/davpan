import type { NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return (
    value
      .split(",")
      .map((part) => part.trim())
      .find(Boolean) || null
  );
}

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function toOriginFromEnv(value: string | undefined): string | null {
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

  return toOrigin(withProtocol);
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function getTrustedOriginsFromEnv(): Set<string> {
  const trusted = new Set<string>();
  const rawOrigins = process.env.CSRF_TRUSTED_ORIGINS;

  if (!rawOrigins) {
    return trusted;
  }

  for (const value of rawOrigins.split(",")) {
    const origin = toOriginFromEnv(value);
    if (origin) {
      trusted.add(normalizeOrigin(origin));
    }
  }

  return trusted;
}

function getExpectedOrigins(request: Request | NextRequest): Set<string> {
  const expected = getTrustedOriginsFromEnv();

  const siteOrigin = toOriginFromEnv(process.env.SITE_URL);
  if (siteOrigin) {
    expected.add(normalizeOrigin(siteOrigin));
  }

  const publicSiteOrigin = toOriginFromEnv(process.env.NEXT_PUBLIC_SITE_URL);
  if (publicSiteOrigin) {
    expected.add(normalizeOrigin(publicSiteOrigin));
  }

  const requestOrigin = toOrigin(request.url);
  if (requestOrigin) {
    expected.add(normalizeOrigin(requestOrigin));
  }

  const host = firstHeaderValue(request.headers.get("host"));
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );

  if (host) {
    const protocol =
      forwardedProto || (host.includes("localhost") ? "http" : "https");
    expected.add(normalizeOrigin(`${protocol}://${host}`));
  }

  if (forwardedHost) {
    const protocol = forwardedProto || "https";
    expected.add(normalizeOrigin(`${protocol}://${forwardedHost}`));
  }

  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    const hostMatch = forwarded.match(/host=([^;\s,]+)/i);
    const protoMatch = forwarded.match(/proto=([^;\s,]+)/i);
    const hostValue = hostMatch?.[1]?.replace(/^"|"$/g, "");
    const protoValue = protoMatch?.[1]?.replace(/^"|"$/g, "");

    if (hostValue) {
      const protocol =
        protoValue || (hostValue.includes("localhost") ? "http" : "https");
      expected.add(normalizeOrigin(`${protocol}://${hostValue}`));
    }
  }

  return expected;
}

export function isSameOriginRequest(request: Request | NextRequest): boolean {
  const expectedOrigins = getExpectedOrigins(request);
  if (expectedOrigins.size === 0) return false;

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    const origin = toOrigin(originHeader);
    if (!origin) {
      return false;
    }

    return expectedOrigins.has(normalizeOrigin(origin));
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    const refererOrigin = toOrigin(refererHeader);
    if (!refererOrigin) {
      return false;
    }

    return expectedOrigins.has(normalizeOrigin(refererOrigin));
  }

  // Fallback for browser form submissions where origin/referer are stripped by proxies.
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite) {
    return (
      fetchSite === "same-origin" ||
      fetchSite === "same-site" ||
      fetchSite === "none"
    );
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
