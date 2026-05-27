import { Compass, File, FileText, Home, Newspaper, Package, Settings, ShieldCheck, User, type LucideIcon } from "lucide-react";

const navigationIcons: Record<string, LucideIcon> = {
  "/": Home,
  "/touren": Compass,
  "/material": Package,
  "/berichte": FileText,
  "/profile": User,
  "/dokumente": File,
  "/guide/dashboard": Compass,
  "/admin/resources": Compass,
  "/admin/material": ShieldCheck,
  "/material/reservation": Settings,
  "/admin/news": Newspaper,
};

export function getNavigationIcon(href: string, fallback: LucideIcon = File): LucideIcon {
  return navigationIcons[href] ?? fallback;
}