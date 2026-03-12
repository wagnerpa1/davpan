"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Compass, User, Menu, X, 
  FileText, File, Package, ShieldCheck, 
  Settings, LogOut, MountainSnow
} from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Touren", href: "/touren", icon: Compass },
  { name: "Profil", href: "/profile", icon: User },
];


interface BottomNavigationProps {
  userRole?: string | null;
}

export function BottomNavigation({ userRole }: BottomNavigationProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const canManage = userRole === 'guide' || userRole === 'admin';

  const moreMenuItems = [
    { name: "Berichte", href: "/berichte", icon: FileText, desc: "Bilder & Berichte vergangener Touren" },
    { name: "Dokumente", href: "/dokumente", icon: File, desc: "Formulare und Mitgliedsanträge" },
    { name: "Material (Demnächst)", href: "/material", icon: Package, desc: "Materialreservierung & Bestand", disabled: true },
    { 
      name: "Guide-Bereich", 
      href: "/guide/dashboard", 
      icon: MountainSnow, 
      desc: "Tourenverwaltung für Leiter", 
      disabled: !canManage 
    },
    { name: "Admin (Demnächst)", href: "/admin", icon: ShieldCheck, desc: "Systemverwaltung", disabled: true },
  ];

  return (
    <>
      {/* OVERLAY MENU for "Mehr" */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-white transition-transform duration-300 ease-in-out md:hidden",
          isMoreOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 pt-safe">
          <h2 className="text-xl font-bold text-slate-900">Menü</h2>
          <button 
            onClick={() => setIsMoreOpen(false)}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4 pb-24">
          <div className="space-y-2">
            {moreMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.disabled ? "#" : item.href}
                  onClick={() => !item.disabled && setIsMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl p-4 transition-colors",
                    item.disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-slate-50 active:bg-slate-100"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    item.disabled ? "bg-slate-100 text-slate-400" : "bg-green-50 text-jdav-green"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
             <form action="/auth/signout" method="POST">
               <button 
                 type="submit"
                 className="flex w-full items-center gap-4 rounded-xl p-4 text-red-600 transition-colors hover:bg-red-50"
               >
                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                   <LogOut className="h-5 w-5" />
                 </div>
                 <h3 className="font-semibold">Abmelden</h3>
               </button>
             </form>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white pb-safe pt-2 md:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href && !isMoreOpen;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMoreOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 px-4 py-1 text-slate-500 transition-colors",
                isActive && "text-jdav-green"
              )}
            >
              <Icon className={cn("h-6 w-6")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
        
        {/* MORE BUTTON */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={cn(
            "flex flex-col items-center justify-center space-y-1 px-4 py-1 text-slate-500 transition-colors",
            isMoreOpen && "text-jdav-green"
          )}
        >
          <Menu className="h-6 w-6" strokeWidth={isMoreOpen ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </nav>
    </>
  );
}
