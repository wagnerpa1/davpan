import { redirect } from "next/navigation";
import { activateCurrentProfile } from "@/app/actions/profile-activation";
import { getCurrentUserProfile } from "@/lib/auth";
import { getRoleDisplayName } from "@/lib/permissions";
import { siteConfig } from "@/lib/site-config";
import { createClient } from "@/utils/supabase/server";

function buildDataReportMailto(params: {
  fullName: string | null;
  membershipNumber: string | null;
  role: string | null;
}) {
  const subject = encodeURIComponent(
    `Datenänderung via App - Mitgl.Nr. ${params.membershipNumber ?? "unbekannt"}`,
  );
  const body = encodeURIComponent(
    [
      `Bitte prüfen Sie meine Daten in der App.`,
      ``,
      `Name: ${params.fullName ?? "Nicht angegeben"}`,
      `Mitgliedsnummer: ${params.membershipNumber ?? "Nicht hinterlegt"}`,
      `Kontotyp: ${params.role ?? "Nicht angegeben"}`,
      ``,
      `Die importierten Daten stimmen nicht mehr. Bitte nehmen Sie die Korrektur in der Sektionsverwaltung vor.`,
    ].join("\n"),
  );

  return `mailto:${siteConfig.supportEmail}?subject=${subject}&body=${body}`;
}

export default async function ActivationReviewPage() {
  const [authContext, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);
  const { user, fullName, membershipNumber, role } = authContext;

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("activated")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.activated) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-green-100 bg-white p-8 shadow-xl shadow-green-100/60 sm:p-10">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-jdav-green-dark">
            Erstes Login
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Bitte prüfe deine Sektionsdaten
          </h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Dein Konto ist angemeldet, aber noch nicht für die App
            freigeschaltet. Hier sehen wir die importierten Stammdaten und
            bereiten den ersten Datenabgleich vor.
          </p>
        </div>

        <div className="mt-8 grid gap-4 rounded-2xl bg-green-50 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {fullName ?? "Nicht angegeben"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mitgliedsnummer
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-900">
              {membershipNumber ?? "Nicht hinterlegt"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kontotyp
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {getRoleDisplayName(role)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-amber-700">
              Noch nicht aktiviert
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Nächster Schritt
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Bitte bestätige die Daten nur, wenn alles stimmt. Falls etwas
            abweicht, melde die Änderung direkt an die Mitgliederverwaltung.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <form action={activateCurrentProfile}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-jdav-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-jdav-green-dark"
              >
                Daten bestätigen
              </button>
            </form>
            <a
              href={buildDataReportMailto({ fullName, membershipNumber, role })}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Daten melden
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
