import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-green-100 p-4 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Offline-Modus</h1>
      <p className="mt-3 max-w-xl text-base text-slate-700">
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
          Touren anzeigen
        </Link>
      </div>
    </main>
  );
}
