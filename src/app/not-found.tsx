import { Compass, Home } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-[70vh] bg-green-50 px-4 py-10">
      <section className="mx-auto max-w-xl rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-jdav-green text-white">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-jdav-green">
          Fehler 404
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Diese Route gibt es nicht oder sie wurde verschoben.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-sm font-semibold text-white hover:bg-jdav-green-dark"
          >
            <Home className="h-4 w-4" />
            Zur Startseite
          </Link>
          <Link
            href="/touren"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Touren ansehen
          </Link>
        </div>
      </section>
    </main>
  );
}
