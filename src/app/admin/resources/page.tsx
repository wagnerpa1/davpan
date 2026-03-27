import { Calendar1, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getResourceBookings,
  getResources,
} from "@/app/actions/admin-resources";
import { getCurrentUserProfile } from "@/lib/auth";
import { DeleteResourceButton } from "./DeleteResourceButton";
import { ResourceCalendar } from "./ResourceCalendar";

export const metadata = {
  title: "Admin - Vereinsressourcen | JDAV Pfarrkirchen",
};

interface ResourceListItem {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  capacity: number | null;
}

export default async function AdminResourcesPage() {
  const authContext = await getCurrentUserProfile();

  if (authContext.role !== "admin" && authContext.role !== "guide") {
    redirect("/");
  }

  const [resources, bookings] = await Promise.all([
    getResources(),
    getResourceBookings(),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar1 className="h-8 w-8 text-jdav-green" />
            Vereinsressourcen
          </h1>
          <p className="text-slate-600 mt-1">
            Verwalten und planen Sie die Nutzung von Vereinsfahrzeugen, Räumen
            oder Beamer.
          </p>
        </div>
        {authContext.role === "admin" && (
          <div className="flex gap-2">
            <Link
              href="/admin/resources/create"
              className="bg-jdav-green hover:bg-jdav-green-dark text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="h-4 w-4" /> Ressource anlegen
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden h-fit">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 font-bold text-slate-700">
            Verfügbare Ressourcen
          </div>
          <div className="p-4 space-y-4">
            {resources.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">
                Noch keine Ressourcen angelegt.
              </div>
            ) : (
              (resources as ResourceListItem[]).map((res) => (
                <div
                  key={res.id}
                  className="border border-slate-100 rounded-xl p-4 hover:border-jdav-green transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900">{res.name}</h3>
                    {authContext.role === "admin" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/resources/${res.id}/edit`}
                          className="text-xs text-blue-600 font-medium px-2 hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteResourceButton resourceId={res.id} />
                      </div>
                    )}
                  </div>
                  {res.description && (
                    <p className="text-xs text-slate-500 mb-2">
                      {res.description}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {res.type && (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        {res.type}
                      </span>
                    )}
                    {res.capacity && (
                      <span className="bg-jdav-green/10 text-jdav-green text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                        {res.capacity} Plätze
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-3 border border-slate-200 bg-white rounded-2xl shadow-sm p-6 overflow-x-auto min-h-[600px]">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            Buchungs-Kalender
          </h2>
          <ResourceCalendar bookings={bookings || []} />
        </div>
      </div>
    </div>
  );
}
