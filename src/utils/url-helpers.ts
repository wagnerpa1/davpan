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

export async function getServerURL() {
  const configuredOrigin =
    normalizeOrigin(process.env.SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return LOCAL_FALLBACK_ORIGIN;
}
