const PRIMARY_NAV_ROUTES = ["/", "/touren", "/material", "/berichte"] as const;

const MORE_MENU_PREFIXES = [
  "/profile",
  "/dokumente",
  "/guide",
  "/admin",
  "/material/reservation",
] as const;

export type RouteTransitionKind = "fade" | "slide-left" | "slide-right";

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function matchesRoute(pathname: string, route: string) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    normalizedPathname === route ||
    normalizedPathname.startsWith(`${route}/`)
  );
}

export function isPrimaryNavRoute(pathname: string) {
  return PRIMARY_NAV_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function isMoreMenuRoute(pathname: string) {
  return MORE_MENU_PREFIXES.some((route) => matchesRoute(pathname, route));
}

function getPrimaryNavIndex(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return PRIMARY_NAV_ROUTES.findIndex((route) => route === normalizedPathname);
}

export function getRouteTransitionKind(
  previousPathname: string,
  nextPathname: string,
  isDesktop: boolean,
): RouteTransitionKind {
  if (!isDesktop) {
    return "fade";
  }

  const previousIndex = getPrimaryNavIndex(previousPathname);
  const nextIndex = getPrimaryNavIndex(nextPathname);

  if (previousIndex === -1 || nextIndex === -1 || previousIndex === nextIndex) {
    return "fade";
  }

  return nextIndex > previousIndex ? "slide-left" : "slide-right";
}
