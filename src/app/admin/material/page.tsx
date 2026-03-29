import { Package, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessMaterialAdmin,
  canManageMaterial,
  getCurrentUserProfile,
} from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { DeleteMaterialButton } from "./DeleteMaterialButton";

interface MaterialInventoryItem {
  size: string | null;
  quantity_total: number;
}

interface MaterialPricingItem {
  price_day: number | null;
}

interface AdminMaterial {
  id: string;
  name: string;
  inventory: MaterialInventoryItem[] | null;
  pricing: MaterialPricingItem[] | null;
}

export const metadata: Metadata = {
  title: "Admin - Material verwalten | JDAV Pfarrkirchen",
};

export default async function AdminMaterialPage() {
  const supabase = await createClient();
  const authContext = await getCurrentUserProfile();
  const canEditInventory = canManageMaterial(authContext.role);

  if (!canAccessMaterialAdmin(authContext.role)) {
    redirect("/");
  }

  const { data: materials, error } = await supabase
    .from("material_types")
    .select(`
      id, name, description, category,
      pricing:material_pricing(price_day),
      inventory:material_inventory(size, quantity_total)
    `)
    .order("name");

  if (error) {
    return (
      <div className="p-8 text-red-500">Fehler beim Laden des Inventars.</div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Material-Bestand
          </h1>
          <p className="text-slate-600 mt-1">
            Verwalten Sie hier alle ausleihbaren Ausrüstungsgegenstände.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/material/reservations"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl transition"
          >
            Zu den Reservierungen
          </Link>
          {canEditInventory && (
            <Link
              href="/admin/material/create"
              className="bg-jdav-green hover:bg-jdav-green-dark text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="h-4 w-4" /> Neues Material
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Größen / Varianten</th>
              <th className="px-6 py-4">Gesamtbestand</th>
              <th className="px-6 py-4">Tagespreis</th>
              {canEditInventory && (
                <th className="px-6 py-4 text-right">Aktionen</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {(materials as AdminMaterial[] | null)?.length ? (
              (materials as AdminMaterial[]).map((mat) => (
                <tr
                  key={mat.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-4 w-4 text-jdav-green" /> {mat.name}
                  </td>
                  <td className="px-6 py-4">
                    {mat.inventory && mat.inventory.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {mat.inventory.map((inv) => (
                          <span
                            key={inv.size || "uni"}
                            className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {inv.size || "Universal"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">
                        Keine Varianten
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {mat.inventory
                      ? mat.inventory.reduce(
                          (acc, cur) => acc + (cur.quantity_total || 0),
                          0,
                        )
                      : 0}{" "}
                    Stk.
                  </td>
                  <td className="px-6 py-4">
                    {mat.pricing?.[0]?.price_day
                      ? `${mat.pricing[0].price_day} €`
                      : "Kostenlos"}
                  </td>
                  {canEditInventory && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/material/${mat.id}/edit`}
                          className="text-sm font-semibold text-slate-500 hover:text-jdav-green transition"
                        >
                          Bearbeiten
                        </Link>
                        <DeleteMaterialButton id={mat.id} />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500 text-sm"
                >
                  Es wurde noch kein Material angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
