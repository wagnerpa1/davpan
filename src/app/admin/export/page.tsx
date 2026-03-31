import { Download } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin - Datenexport | JDAV Pfarrkirchen",
};

export default async function AdminExportPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  // Für das Folgejahr
  const nextYear = new Date().getFullYear() + 1;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Datenexport
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Hier können Administratoren strukturierte Listen als CSV
          herunterladen.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Touren & Teilnehmer Export */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Touren & Teilnehmer
          </h2>
          <p className="mb-6 text-sm text-slate-600">
            Exportiert alle geplanten Touren inklusive Startdatum, Guide und
            allen bestaetigten Teilnehmern. Ideal fuer die Jahresplanung.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <form action="/api/admin/export" method="GET">
              <input type="hidden" name="type" value="tours-current" />
              <Button type="submit" variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Aktuelles Jahr
              </Button>
            </form>
            <form action="/api/admin/export" method="GET">
              <input type="hidden" name="type" value="tours-next" />
              <Button
                type="submit"
                className="w-full bg-jdav-green text-white hover:bg-jdav-green-800"
              >
                <Download className="mr-2 h-4 w-4" />
                Folgejahr ({nextYear})
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
