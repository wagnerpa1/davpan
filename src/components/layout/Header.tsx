"use client";

import Link from "next/link";
import { Mountain } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-jdav-green" />
          <span className="text-xl font-bold tracking-tight text-slate-900">
            DAV <span className="text-jdav-green">Pfarrkirchen</span>
          </span>
        </Link>
        <nav className="ml-8 hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-jdav-green transition-colors">Startseite</Link>
          <Link href="/touren" className="text-sm font-medium text-slate-600 hover:text-jdav-green transition-colors">Touren</Link>
          <Link href="/berichte" className="text-sm font-medium text-slate-600 hover:text-jdav-green transition-colors">Berichte</Link>
          <Link href="/dokumente" className="text-sm font-medium text-slate-600 hover:text-jdav-green transition-colors">Dokumente</Link>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <Link href="/profile" className="hidden md:block text-sm font-medium text-slate-600 hover:text-jdav-green transition-colors">Profil</Link>
          <form action="/auth/signout" method="POST" className="hidden md:block">
            <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
