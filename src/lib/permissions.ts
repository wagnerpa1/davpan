/**
 * Represents all valid user roles in the application.
 */
export type AppUserRole =
  | "member"
  | "parent"
  | "guide"
  | "materialwart"
  | "admin";

export type RoleLike = AppUserRole | string | null | undefined;

/**
 * Checks if the given role is an admin role.
 */
export function isAdminRole(role: RoleLike): boolean {
  return role === "admin";
}

/**
 * Checks if the given role is a guide role.
 */
export function isGuideRole(role: RoleLike): boolean {
  return role === "guide";
}

/**
 * Checks if the user is allowed to manage material (Materialwart or Admin).
 */
export function canManageMaterial(role: RoleLike): boolean {
  return role === "materialwart" || isAdminRole(role);
}

/**
 * Checks if the user is allowed to access the material admin view (Guide, Materialwart, or Admin).
 */
export function canAccessMaterialAdmin(role: RoleLike): boolean {
  return canManageMaterial(role) || isGuideRole(role);
}
