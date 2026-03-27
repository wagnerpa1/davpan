"use client";

import Image from "next/image";
import Link from "next/link";

interface HeaderProps {
  userRole?: string | null;
}

export function Header({ userRole }: HeaderProps) {
  const canManage = userRole === "guide" || userRole === "admin";
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="motion-press flex items-center">
          <Image
            src="/JDAV-Logo-grün-ganz.svg"
            alt="JDAV Pfarrkirchen Logo"
            width={180}
            height={48}
            className="h-10 w-auto transition-transform duration-200 hover:scale-[1.02] sm:h-12"
          />
        </Link>
        <nav className="ml-8 hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Startseite
          </Link>
          <Link
            href="/touren"
            className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Touren
          </Link>
          <Link
            href="/berichte"
            className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Berichte
          </Link>
          <Link
            href="/dokumente"
            className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Dokumente
          </Link>
          <Link
            href="/material"
            className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Material
          </Link>
          {canManage && (
            <Link
              href="/admin/resources"
              className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
            >
              Ressourcen
            </Link>
          )}
          {canManage && (
            <Link
              href="/admin/material"
              className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
            >
              Inventar
            </Link>
          )}
          {userRole === "admin" && (
            <Link
              href="/admin/dokumente"
              className="text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
            >
              Dokumente-Admin
            </Link>
          )}
          {canManage && (
            <Link
              href="/guide/dashboard"
              className="text-sm font-bold text-jdav-green-dark hover:text-jdav-green transition-colors"
            >
              Guide-Bereich
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <Link
            href="/profile"
            className="hidden md:block text-sm font-medium text-slate-700 hover:text-jdav-green transition-colors"
          >
            Profil
          </Link>
          <form
            action="/auth/signout"
            method="POST"
            className="hidden md:block"
          >
            <button
              type="submit"
              className="motion-press text-sm font-medium text-red-600 transition-colors hover:text-red-700"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
