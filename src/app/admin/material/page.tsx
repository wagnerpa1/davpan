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
  const tableColumns = canEditInventory ? 5 : 4;

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/admin/material/reservations"
            className="rounded-xl bg-slate-100 px-4 py-2 text-center font-bold text-slate-800 transition hover:bg-slate-200"
          >
            Zu den Reservierungen
          </Link>
          {canEditInventory && (
            <Link
              href="/admin/material/create"
              className="flex items-center justify-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-center font-bold text-white shadow-sm transition hover:bg-jdav-green-dark"
            >
              <Plus className="h-4 w-4" /> Neues Material
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 md:hidden">
          {(materials as AdminMaterial[] | null)?.length ? (
            (materials as AdminMaterial[]).map((mat) => {
              const totalStock = mat.inventory
                ? mat.inventory.reduce(
                    (acc, cur) => acc + (cur.quantity_total || 0),
                    0,
                  )
                : 0;

              return (
                <div key={mat.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Package className="mt-0.5 h-4 w-4 shrink-0 text-jdav-green" />
                      <h2 className="text-base font-bold text-slate-900">
                        {mat.name}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Größen / Varianten
                      </p>
                      {mat.inventory && mat.inventory.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {mat.inventory.map((inv) => (
                            <span
                              key={inv.size || "uni"}
                              className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {inv.size || "Universal"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm italic text-slate-400">
                          Keine Varianten
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Gesamtbestand
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {totalStock} Stk.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tagespreis
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {mat.pricing?.[0]?.price_day
                            ? `${mat.pricing[0].price_day} €`
                            : "Kostenlos"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canEditInventory && (
                    <div className="flex gap-3 pt-1">
                      <Link
                        href={`/admin/material/${mat.id}/edit`}
                        className="text-sm font-semibold text-slate-600 transition hover:text-jdav-green"
                      >
                        Bearbeiten
                      </Link>
                      <DeleteMaterialButton id={mat.id} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              Es wurde noch kein Material angelegt.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
                    colSpan={tableColumns}
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
    </div>
  );
}
