import {
  canAccessMaterialAdmin,
  canManageMaterial,
  isAdminRole,
  isGuideRole,
} from "@/lib/permissions";

export { canAccessMaterialAdmin, canManageMaterial, isAdminRole, isGuideRole };
export { getCurrentUserProfile } from "@/lib/auth-server";

export function getAuthCallbackUrl(path = "/auth/callback") {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${siteUrl}${path}`;
}
