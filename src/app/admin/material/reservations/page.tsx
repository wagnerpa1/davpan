import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { ReservationStatusManager } from "./ReservationStatusManager";

export const metadata = {
  title: "Material Reservierungen - Admin | JDAV Pfarrkirchen",
};

interface ReservationRow {
  id: string;
  status: string | null;
  quantity: number | null;
  loan_date: string | null;
  return_date: string | null;
  tour_id: string | null;
  tours?: { title?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
  child_profiles?: { full_name?: string | null } | null;
  material_inventory?: {
    size?: string | null;
    material_types?: { name?: string | null } | null;
  } | null;
}

const statusLabel = (status: string | null) => {
  switch (status) {
    case "reserved":
      return "Reserviert";
    case "on loan":
      return "Ausgeliehen";
    case "returned":
      return "Zurückgegeben";
    default:
      return status || "Unbekannt";
  }
};

const statusColor = (status: string | null) => {
  switch (status) {
    case "reserved":
      return "bg-amber-100 text-amber-700";
    case "on loan":
      return "bg-blue-100 text-blue-700";
    case "returned":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export default async function AdminMaterialReservationsPage() {
  const supabase = await createClient();
  const authContext = await getCurrentUserProfile();

  if (authContext.role !== "admin" && authContext.role !== "guide") {
    redirect("/");
  }

  // Fetch reservations with related data
  const { data: reservations, error } = await supabase
    .from("material_reservations")
    .select(`
      id,
      quantity,
      loan_date,
      return_date,
      status,
      tour_id,
      tours:tour_id (title),
      material_inventory:material_inventory_id(
        size,
        material_types(name)
      ),
      profiles:user_id (full_name),
      child_profiles:child_profile_id (full_name)
    `)
    .order("loan_date", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 text-center">
        Fehler beim Laden der Reservierungen.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link
          href="/admin/material"
          className="text-slate-500 hover:text-jdav-green font-medium"
        >
          &larr; Zurück zum Bestand
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Reservierungen & Verleih
        </h1>
        <p className="text-slate-600 mt-1">
          Alle aktuellen und vergangenen Materialausleihen (Tour-gebunden &
          Privat).
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-tighter text-xs">
            <tr>
              <th className="px-6 py-4">Material / Größe</th>
              <th className="px-6 py-4">Person</th>
              <th className="px-6 py-4">Kontext (Tour / Privat)</th>
              <th className="px-6 py-4">Zeitraum</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {(reservations as ReservationRow[] | null)?.length ? (
              (reservations as ReservationRow[]).map((res) => (
                <tr
                  key={res.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">
                      {res.material_inventory?.material_types?.name ||
                        "Unbekannt"}
                    </div>
                    {res.material_inventory?.size && (
                      <div className="text-xs text-slate-500">
                        Größe: {res.material_inventory.size}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {res.child_profiles?.full_name ||
                      res.profiles?.full_name ||
                      "Unbekannt"}
                    {res.child_profiles && (
                      <span className="ml-2 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                        Kind
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {res.tour_id ? (
                      <Link
                        href={`/touren/${res.tour_id}`}
                        className="text-jdav-green hover:underline font-medium"
                      >
                        {res.tours?.title || "Tour"}
                      </Link>
                    ) : (
                      <span className="italic text-slate-500">
                        Private Ausleihe
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-50 font-medium">Von:</span>
                        {res.loan_date
                          ? format(new Date(res.loan_date), "dd.MM.yy")
                          : "–"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="opacity-50 font-medium">Bis:</span>
                        {res.return_date
                          ? format(new Date(res.return_date), "dd.MM.yy")
                          : "–"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight",
                        statusColor(res.status),
                      )}
                    >
                      {statusLabel(res.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ReservationStatusManager
                      id={res.id}
                      currentStatus={res.status}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500 text-sm italic"
                >
                  Noch keine Reservierungen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
