import {
  canAccessMaterialAdmin,
  canManageMaterial,
  isAdminRole,
  isGuideRole,
} from "@/lib/permissions";

export { canAccessMaterialAdmin, canManageMaterial, isAdminRole, isGuideRole };
export { getCurrentUserProfile } from "@/lib/auth-server";

export function getAuthCallbackUrl(path = "/auth/callback") {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return `${siteUrl}${path}`;
}
