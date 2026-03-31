import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Offline-Modus</h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Du bist aktuell offline. Die Start- und Tourenansicht sind als
        Offline-Ansicht verfügbar, bis wieder eine Internetverbindung besteht.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        <Link
          href="/"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-jdav-green hover:text-jdav-green"
        >
          Startseite anzeigen
        </Link>
        <Link
          href="/touren"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-jdav-green hover:text-jdav-green"
        >
          Tourenseite anzeigen
        </Link>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Sobald du wieder online bist, werden die Inhalte automatisch
        aktualisiert.
      </p>
    </main>
  );
}
