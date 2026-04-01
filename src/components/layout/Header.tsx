"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MemberBarcodePopup } from "@/components/layout/MemberBarcodePopup";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { buildNavigation } from "@/lib/navigation/nav-config";

interface HeaderProps {
  birthdate: string | null;
  membershipNumber: string | null;
  userRole?: string | null;
}

export function Header({ birthdate, membershipNumber, userRole }: HeaderProps) {
  const isParent = userRole === "parent";
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navigation = buildNavigation(userRole);

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/JDAV-Logo-grün-ganz.svg"
            alt="JDAV Pfarrkirchen Logo"
            width={180}
            height={48}
            className="h-auto w-[88px] sm:w-[104px] md:w-[120px]"
          />
        </Link>
        <nav className="ml-8 hidden items-center gap-6 md:flex">
          {navigation.primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-700 transition-colors hover:text-jdav-green"
            >
              {item.label}
            </Link>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-jdav-green"
            >
              Mehr
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isMoreOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isMoreOpen && (
              <div className="absolute left-0 top-9 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="space-y-3">
                  {navigation.groups.map((group) => (
                    <section key={group.label} className="space-y-1.5">
                      <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {group.label}
                      </h3>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className="block rounded-xl px-2 py-2 text-sm text-slate-700 transition hover:bg-green-50 hover:text-jdav-green"
                        >
                          <p className="font-semibold">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                        </Link>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <MemberBarcodePopup
            membershipNumber={membershipNumber}
            birthdate={birthdate}
          />
          <NotificationCenter isParent={isParent} />
          <form
            action="/auth/signout"
            method="POST"
            className="hidden md:block"
          >
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
