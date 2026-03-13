"use client";

import {
  Compass,
  File,
  FileText,
  Home,
  LogOut,
  Menu,
  MountainSnow,
  Package,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Touren", href: "/touren", icon: Compass },
  { name: "Berichte", href: "/berichte", icon: FileText },
  { name: "Profil", href: "/profile", icon: User },
];

interface BottomNavigationProps {
  userRole?: string | null;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const canManage = userRole === "guide" || userRole === "admin";

  const moreMenuItems = [
    {
      name: "Dokumente",
      href: "/dokumente",
      icon: File,
      desc: "Formulare und Mitgliedsanträge",
    },
    {
      name: "Material (Demnächst)",
      href: "/material",
      icon: Package,
      desc: "Materialreservierung & Bestand",
      disabled: true,
    },
    {
      name: "Guide-Bereich",
      href: "/guide/dashboard",
      icon: MountainSnow,
      desc: "Tourenverwaltung für Leiter",
      disabled: !canManage,
    },
    {
      name: "Admin (Demnächst)",
      href: "/admin",
      icon: ShieldCheck,
      desc: "Systemverwaltung",
      disabled: true,
    },
  ];

  return (
    <>
      {/* OVERLAY MENU for "Mehr" */}
      <div
        className={cn(
          "fixed inset-0 z-60 bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out md:hidden",
          isMoreOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-full pointer-events-none",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6 pt-safe">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Menü
            </h2>
            <p className="text-xs text-slate-500 font-medium lowercase tracking-wider">
              JDAV Pfarrkirchen
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="rounded-full bg-slate-100 p-2.5 text-slate-600 transition-transform active:scale-90"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="h-[calc(100vh-10rem)] overflow-y-auto px-4 py-6 pb-32">
          <div className="grid grid-cols-1 gap-3">
            {moreMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.disabled ? "#" : item.href}
                  onClick={() => !item.disabled && setIsMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 transition-all border border-transparent shadow-sm",
                    item.disabled
                      ? "opacity-40 grayscale cursor-not-allowed bg-slate-50"
                      : "bg-white hover:bg-slate-50 active:scale-[0.98] active:bg-slate-100 border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] shadow-sm",
                      item.disabled
                        ? "bg-slate-200 text-slate-400"
                        : "bg-jdav-green/10 text-jdav-green",
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 leading-none mb-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 border-t border-slate-100 pt-8">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="group flex w-full items-center gap-4 rounded-2xl p-4 text-red-600 transition-all hover:bg-red-50 bg-white border border-red-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-red-100/50 text-red-600 transition-colors group-hover:bg-red-100">
                  <LogOut className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <h3 className="font-black">Abmelden</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">
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
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href && !isMoreOpen;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              className={cn(
                "group relative flex flex-col items-center justify-center px-1.5 py-1 transition-all duration-300",
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
                {item.name}
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
            "group relative flex flex-col items-center justify-center px-1.5 py-1 transition-all duration-300",
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
