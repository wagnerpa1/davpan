import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 via-white to-green-100 p-4">
      <div className="w-full max-w-2xl space-y-8 rounded-3xl border border-green-100 bg-white p-8 shadow-2xl shadow-green-100/60 sm:p-10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-jdav-green-dark">
            Sektionszugang
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Mitglied aktivieren oder Gast anfragen
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600">
            Sektionsmitglieder melden sich mit Mitgliedsnummer und Geburtsdatum
            an. Gastzugänge sind weiterhin möglich und werden getrennt von der
            Sektionsaktivierung behandelt.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Mitglied</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Mitgliedsnummer, Geburtsdatum und E-Mail werden für die
              Aktivierung mit der Sektionsdatenbank abgeglichen.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Gast</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Für Gäste bleibt der Zugang bewusst einfacher. Die Freischaltung
              erfolgt getrennt vom Mitglieder-Review.
            </p>
          </div>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
