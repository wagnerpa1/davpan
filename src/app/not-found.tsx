import { Compass } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4">
      <section className="mx-auto max-w-xl rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-jdav-green text-white">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-jdav-green">
          Fehler 404
        </p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-base text-slate-700">
          Diese Route gibt es nicht oder sie wurde verschoben.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-jdav-green px-4 py-2 text-base font-semibold text-white hover:bg-jdav-green-dark"
        >
          Zur Startseite
        </Link>
      </section>
    </main>
  );
}
