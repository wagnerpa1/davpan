export type AppUserRole =
  | "member"
  | "parent"
  | "guide"
  | "materialwart"
  | "admin";

export type RoleLike = AppUserRole | string | null | undefined;

export function isAdminRole(role: RoleLike): boolean {
  return role === "admin";
}

export function isGuideRole(role: RoleLike): boolean {
  return role === "guide";
}

export function canManageMaterial(role: RoleLike): boolean {
  return role === "materialwart" || isAdminRole(role);
}

export function canAccessMaterialAdmin(role: RoleLike): boolean {
  return canManageMaterial(role) || isGuideRole(role);
}
