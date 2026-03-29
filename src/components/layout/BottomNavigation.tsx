"use client";

import {
  Compass,
  File,
  FileText,
  Home,
  LogOut,
  type LucideIcon,
  Menu,
  Newspaper,
  Package,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { buildNavigation } from "@/lib/navigation/nav-config";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  userRole?: string | null;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navigation = buildNavigation(userRole);

  const isActivePath = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const iconByHref: Record<string, LucideIcon> = {
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

  return (
    <>
      {/* Floating popup for "Mehr" */}
      <div
        className={cn(
          "fixed inset-0 z-60 md:hidden transition-opacity duration-200",
          isMoreOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Menü schließen"
          onClick={() => setIsMoreOpen(false)}
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        />

        <div
          className={cn(
            "absolute bottom-24 left-4 right-4 mx-auto max-h-[calc(100vh-12rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200",
            isMoreOpen
              ? "translate-y-0 scale-100"
              : "translate-y-3 scale-[0.98]",
          )}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Mehr
              </h2>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                JDAV Pfarrkirchen
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="rounded-full bg-slate-100 p-2 text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {navigation.groups.map((group) => (
              <section key={group.label} className="space-y-2">
                <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const ItemIcon = iconByHref[item.href] ?? File;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm transition hover:border-jdav-green/30 hover:bg-green-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jdav-green/10 text-jdav-green">
                          <ItemIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="group flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-3 py-3 text-red-700 transition hover:bg-red-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 transition-colors group-hover:bg-red-200">
                  <LogOut className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black">Abmelden</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                    Sitzung beenden
                  </p>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 w-full items-center justify-around border-t border-slate-100 bg-white/90 backdrop-blur-lg pb-safe-bottom pt-1 md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        {navigation.primary.map((item) => {
          const isActive = isActivePath(item.href) && !isMoreOpen;
          const Icon = iconByHref[item.href] ?? Home;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              className={cn(
                "motion-press group relative flex flex-col items-center justify-center px-1.5 py-1 transition-all duration-300",
                isActive
                  ? "text-jdav-green"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-9 w-14 items-center justify-center rounded-full transition-all duration-300",
                  isActive ? "bg-jdav-green/10" : "group-active:bg-slate-100",
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform duration-300",
                    isActive && "scale-110",
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold tracking-tight transition-all duration-300",
                  isActive ? "opacity-100 scale-100" : "opacity-70 scale-95",
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-jdav-green" />
              )}
            </Link>
          );
        })}

        {/* MORE BUTTON */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={cn(
            "motion-press group relative flex flex-col items-center justify-center px-1.5 py-1 transition-all duration-300",
            isMoreOpen
              ? "text-jdav-green"
              : "text-slate-400 hover:text-slate-600",
          )}
        >
          <div
            className={cn(
              "mb-1 flex h-9 w-14 items-center justify-center rounded-full transition-all duration-300",
              isMoreOpen ? "bg-jdav-green/10" : "group-active:bg-slate-100",
            )}
          >
            {isMoreOpen ? (
              <X
                className="h-6 w-6 scale-110 transition-transform"
                strokeWidth={2.5}
              />
            ) : (
              <Menu
                className="h-6 w-6 transition-transform group-hover:rotate-12"
                strokeWidth={2}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-bold tracking-tight transition-all duration-300",
              isMoreOpen ? "opacity-100 scale-100" : "opacity-70 scale-95",
            )}
          >
            Mehr
          </span>
          {isMoreOpen && (
            <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-jdav-green" />
          )}
        </button>
      </nav>
    </>
  );
}
