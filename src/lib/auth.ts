import {
  canAccessMaterialAdmin,
  canManageMaterial,
  isAdminRole,
  isGuideRole,
} from "@/lib/permissions";

export { canAccessMaterialAdmin, canManageMaterial, isAdminRole, isGuideRole };
export { getCurrentUserProfile } from "@/lib/auth-server";
