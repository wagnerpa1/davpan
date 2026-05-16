"use client";

export default function GlobalErrorPage() {
  return (
    <html lang="de">
      <body className="bg-green-100 px-4 py-10">
        <main className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Schwerer Fehler
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">
            Anwendung konnte nicht geladen werden
          </h1>
          <p className="mt-2 text-base text-slate-700">
            Bitte lade die Seite neu. Wenn das Problem bleibt, versuche es
            später erneut.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-xl bg-jdav-green px-4 py-2 text-base font-semibold text-white hover:bg-jdav-green-dark"
          >
            Zur Startseite
          </a>
        </main>
      </body>
    </html>
  );
}
