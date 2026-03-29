"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function AppErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[70vh] bg-green-50 px-4 py-10">
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Unerwarteter Fehler
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Da ist etwas schiefgelaufen
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Bitte versuche es erneut. Falls der Fehler bleibt, melde dich beim
          Team.
        </p>

        {error?.digest && (
          <p className="mt-2 text-xs text-slate-500">
            Referenz: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-sm font-semibold text-white hover:bg-jdav-green-dark"
          >
            <RotateCcw className="h-4 w-4" />
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}