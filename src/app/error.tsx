"use client";

import { AlertTriangle } from "lucide-react";

export default function AppErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Unerwarteter Fehler
        </p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">
          Ein Fehler ist aufgetreten
        </h1>
        <p className="mt-2 text-base text-slate-700">
          Bitte versuche es später erneut oder kontaktiere den Support.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex rounded-xl bg-jdav-green px-4 py-2 text-base font-semibold text-white hover:bg-jdav-green-dark"
        >
          Erneut versuchen
        </button>
      </section>
    </main>
  );
}
