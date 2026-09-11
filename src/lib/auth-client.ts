export function getAuthCallbackUrl(path = "/auth/callback") {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${siteUrl}${path}`;
}
