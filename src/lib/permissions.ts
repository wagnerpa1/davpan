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
 * Checks if the given role is a material steward role.
 */
export function isMaterialwartRole(role: RoleLike): boolean {
  return role === "materialwart";
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

/**
 * Checks if the user can create standalone resource bookings.
 */
export function canBookStandaloneResource(role: RoleLike): boolean {
  return isGuideRole(role) || isMaterialwartRole(role) || isAdminRole(role);
}

/**
 * Checks if the user can create tours.
 */
export function canCreateTour(role: RoleLike): boolean {
  return isGuideRole(role) || isAdminRole(role);
}

/**
 * Returns the display label for a role in the UI.
 */
export function getRoleDisplayName(role: RoleLike): string {
  switch (role) {
    case "guide":
      return "Tourenleiter (Guide)";
    case "materialwart":
      return "Materialwart";
    case "admin":
      return "Administrator";
    case "parent":
      return "Elternkonto";
    default:
      return "Mitglied";
  }
}
