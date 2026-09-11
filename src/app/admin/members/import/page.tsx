import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";
import { MemberImportForm } from "./MemberImportForm";

export const metadata: Metadata = {
  title: "Admin - Mitglieder importieren",
};

export default async function AdminMemberImportPage() {
  const [authContext, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!isAdminRole(authContext.role)) {
    redirect("/");
  }

  const { data: latestImportRows } = await supabase
    .from("section_member_imports")
    .select(
      "id, membership_number, first_name, last_name, birthdate, family_number, membership_category_code, imported_at",
    )
    .order("imported_at", { ascending: false })
    .limit(20);
  const latestImports = latestImportRows ?? [];

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 flex flex-col gap-4 lg:mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Mitglieder importieren
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Lade Mavis-Exportdaten hoch, prüfe die Vorschau und starte den
            idempotenten Import in die Import- und Sektionsdatenbank.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
        <MemberImportForm />

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Letzte Importzeilen
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4">Mitgliedsnummer</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Familie</th>
                  <th className="px-6 py-4">Kategorie</th>
                  <th className="px-6 py-4">Importiert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestImports.length > 0 ? (
                  latestImports.map((row) => (
                    <tr key={row.id} className="text-slate-700">
                      <td className="px-6 py-4 font-mono text-xs">
                        {row.membership_number}
                      </td>
                      <td className="px-6 py-4">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="px-6 py-4">{row.family_number ?? "-"}</td>
                      <td className="px-6 py-4">
                        {row.membership_category_code}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(row.imported_at).toLocaleString("de-DE")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Noch keine Importdaten vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
