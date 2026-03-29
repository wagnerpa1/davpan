import { canAccessMaterialAdmin, canManageMaterial } from "@/lib/permissions";

interface AppNavItem {
  label: string;
  href: string;
  description?: string;
}

interface AppNavGroup {
  label: string;
  items: AppNavItem[];
}

export interface AppNavigation {
  primary: AppNavItem[];
  groups: AppNavGroup[];
}

export function buildNavigation(userRole?: string | null): AppNavigation {
  const isGuideOrAdmin = userRole === "guide" || userRole === "admin";
  const isAdmin = userRole === "admin";
  const isMaterialwart = userRole === "materialwart";
  const canOpenMaterialAdmin = canAccessMaterialAdmin(userRole);
  const canOpenReservations = canManageMaterial(userRole);

  const groups: AppNavGroup[] = [];

  if (!isMaterialwart) {
    groups.push({
      label: "Allgemein",
      items: [
        {
          label: "Profil",
          href: "/profile",
          description: "Persoenliche Daten und Einstellungen",
        },
        {
          label: "Dokumente",
          href: "/dokumente",
          description: "Formulare, Vereinsregeln und Packlisten",
        },
      ],
    });
  }

  if (canOpenMaterialAdmin || canOpenReservations) {
    const materialItems: AppNavItem[] = [];

    if (canOpenMaterialAdmin) {
      materialItems.push({
        label: "Materialverwaltung",
        href: "/admin/material",
        description: "Bestand und Materialtypen verwalten",
      });
    }

    if (canOpenReservations) {
      materialItems.push({
        label: "Reservierungen",
        href: "/material/reservation",
        description: "Direkt zu Reservierungen und Ausgaben",
      });
    }

    if (materialItems.length > 0) {
      groups.push({ label: "Material", items: materialItems });
    }
  }

  if (isGuideOrAdmin) {
    groups.push({
      label: "Tourenleiter",
      items: [
        {
          label: "Guide Dashboard",
          href: "/guide/dashboard",
          description: "Touren, Teilnehmende und Berichte",
        },
        {
          label: "Ressourcen",
          href: "/admin/resources",
          description: "Vereinsbus, Raeume und Planung",
        },
      ],
    });
  }

  if (isAdmin) {
    groups.push({
      label: "Admin Tools",
      items: [
        {
          label: "Vereinsnews",
          href: "/admin/news",
          description: "News erstellen und veroefentlichen",
        },
      ],
    });
  }

  return {
    primary: [
      { label: "Home", href: "/" },
      { label: "Touren", href: "/touren" },
      { label: "Material", href: "/material" },
      { label: "Berichte", href: "/berichte" },
    ],
    groups,
  };
}
