import { Euro, Package, Ruler, Settings } from "lucide-react";
import Link from "next/link";
import { MaterialBookingForm } from "@/components/material/MaterialBookingForm";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Materialausleihe | JDAV Pfarrkirchen",
  description:
    "Zentraler Material-Verleih für Mitglieder der JDAV Pfarrkirchen",
};

interface MaterialRow {
  id: string;
  name: string;
  total_quantity: number;
  size: string | null;
  price_day: number | null;
  price_extraday: number | null;
  price_week: number | null;
  availableItems: number; // berechneter wert
  availableSizes: { id: string; size: string }[];
}

interface MaterialInventoryItem {
  id: string;
  size: string | null;
  quantity_total: number;
}

interface MaterialPricingItem {
  price_day: number | null;
  price_extra_day: number | null;
  price_week: number | null;
}

interface MaterialTypeRow {
  id: string;
  name: string;
  inventory: MaterialInventoryItem[] | null;
  pricing: MaterialPricingItem[] | null;
}

export default async function MaterialPage() {
  const supabase = await createClient();
  const authContext = await getCurrentUserProfile();

  const isAdminOrGuide =
    authContext.role === "admin" || authContext.role === "guide";

  // Hole das gesamte Material
  const { data: materials, error } = await supabase
    .from("material_types")
    .select(`
      id, name, description,
      pricing:material_pricing(price_day, price_extra_day, price_week),
      inventory:material_inventory(id, size, quantity_total)
    `)
    .order("name");

  if (error || !materials) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-red-500">
        Fehler beim Laden des Materialbestands.
      </div>
    );
  }

  // TODO: Verfeinerte Logik "verfügbare Menge" auf Basis aktueller Datumsbereiche
  // Für das UI zeigen wir vorerst den Gesamtbestand an, echte Validierung beim Buchen/im Admin Panel
  const displayMaterials = (materials as MaterialTypeRow[]).map((m) => {
    const totalQty = m.inventory
      ? m.inventory.reduce((acc, cur) => acc + (cur.quantity_total || 0), 0)
      : 0;
    const sizes = m.inventory
      ? m.inventory.map((inv) => ({
          id: inv.id,
          size: inv.size || "Universalgröße",
        }))
      : [];
    const sizesString = sizes.map((s) => s.size).join(", ");

    return {
      id: m.id,
      name: m.name,
      total_quantity: totalQty,
      size: sizesString || null,
      availableSizes: sizes,
      price_day:
        m.pricing && m.pricing.length > 0 ? m.pricing[0].price_day : null,
      price_extraday:
        m.pricing && m.pricing.length > 0 ? m.pricing[0].price_extra_day : null,
      price_week:
        m.pricing && m.pricing.length > 0 ? m.pricing[0].price_week : null,
      availableItems: totalQty,
    };
  }) as MaterialRow[];

  function formatPriceRow(
    day: number | null,
    extra: number | null,
    week: number | null,
  ) {
    const parts = [];
    if (day !== null) parts.push(`${day}€/Tag`);
    if (extra !== null) parts.push(`${extra}€ ab 2. Tag`);
    if (week !== null) parts.push(`${week}€/Woche`);
    if (parts.length === 0) return "Kostenlos";
    return parts.join(" • ");
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 pb-32">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            Materialausleihe
          </h1>
          <p className="mt-2 text-slate-600">
            Leihen Sie sich Material für Ihre privaten Touren. Für JDAV/DAV
            Touren wird Material direkt in der Anmeldung gebucht.
          </p>
        </div>
        {isAdminOrGuide && (
          <Link
            href="/admin/material"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white shadow hover:bg-slate-700 transition"
          >
            <Settings className="h-4 w-4" /> Admin-Dashboard
          </Link>
        )}
      </div>

      {!authContext.user && (
        <div className="mb-8 rounded-2xl bg-orange-50 p-6 text-orange-800 border border-orange-200 shadow-sm">
          <p className="font-semibold text-lg">Einloggen erforderlich</p>
          <p className="opacity-90 mt-1">
            Sie müssen angemeldet sein, um Material reservieren zu können.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-orange-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-orange-700"
          >
            Zum Login
          </Link>
        </div>
      )}

      {/* Grid Liste des Invetare */}
      <h2 className="text-xl font-bold text-slate-900 mb-4">Unser Material</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayMaterials.map((mat) => (
          <div
            key={mat.id}
            className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow"
          >
            {/* Kopfbereich der Karte */}
            <div className="p-6">
              <div className="mb-2 flex items-center gap-2 text-jdav-green">
                <Package className="h-6 w-6" />
                <h3 className="font-bold text-lg text-slate-900">{mat.name}</h3>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 opacity-50" />
                  Größen:{" "}
                  <span className="font-medium text-slate-900">
                    {mat.size || "Universalgröße"}
                  </span>
                </p>
                <div className="flex items-start gap-2">
                  <Euro className="h-4 w-4 opacity-50 shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-900 flex-1">
                    {formatPriceRow(
                      mat.price_day,
                      mat.price_extraday,
                      mat.price_week,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Buchungsbereich (Footer) */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 mt-auto">
              <MaterialBookingForm
                materialId={mat.id}
                materialName={mat.name}
                availableSizes={mat.availableSizes}
                isLoggedIn={!!authContext.user}
              />
            </div>
          </div>
        ))}
      </div>

      {materials.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
          Aktuell ist kein Material im Verleih erfasst.
        </div>
      )}
    </div>
  );
}
