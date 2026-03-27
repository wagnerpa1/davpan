"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrUpdateMaterialGroup } from "@/app/actions/admin-material";
import { Button } from "@/components/ui/button";

interface InventoryItem {
  id: string;
  size: string;
  quantity_total: number;
}

interface MaterialFormProps {
  initialData?: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    pricing: {
      price_day: number | null;
      price_extra_day: number | null;
      price_week: number | null;
    } | null;
    inventory: {
      id?: string;
      size: string | null;
      quantity_total: number;
    }[];
  };
}

export function MaterialForm({ initialData }: MaterialFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize inventory items with a unique ID for React keys
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    if (initialData?.inventory && initialData.inventory.length > 0) {
      return initialData.inventory.map((inv) => ({
        id: inv.id || crypto.randomUUID(),
        size: inv.size || "",
        quantity_total: inv.quantity_total,
      }));
    }
    return [{ id: crypto.randomUUID(), size: "", quantity_total: 1 }];
  });

  const addInventoryItem = () => {
    setInventoryItems([
      ...inventoryItems,
      { id: crypto.randomUUID(), size: "", quantity_total: 1 },
    ]);
  };

  const removeInventoryItem = (id: string) => {
    if (inventoryItems.length === 1) return; // keep at least one
    setInventoryItems(inventoryItems.filter((item) => item.id !== id));
  };

  const updateInventoryItem = (
    id: string,
    field: keyof InventoryItem,
    value: InventoryItem[keyof InventoryItem],
  ) => {
    setInventoryItems(
      inventoryItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const typeData = {
      id: initialData?.id,
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      description: formData.get("description") as string,
    };

    const price_day = formData.get("price_day")
      ? parseFloat(formData.get("price_day") as string)
      : null;
    const price_extra_day = formData.get("price_extra_day")
      ? parseFloat(formData.get("price_extra_day") as string)
      : null;
    const price_week = formData.get("price_week")
      ? parseFloat(formData.get("price_week") as string)
      : null;

    const pricingData = {
      price_day,
      price_extra_day,
      price_week,
    };

    const inventoryData = inventoryItems.map((item) => ({
      size: item.size.trim() || null,
      quantity_total: item.quantity_total,
    }));

    const result = await createOrUpdateMaterialGroup(
      typeData,
      pricingData,
      inventoryData,
    );

    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/admin/material");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Basisdaten */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
          Allgemein
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="material-name"
              className="text-sm font-bold text-slate-700"
            >
              Name / Typ *
            </label>
            <input
              id="material-name"
              type="text"
              name="name"
              defaultValue={initialData?.name}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              placeholder="z.B. Klettergurt"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="material-category"
              className="text-sm font-bold text-slate-700"
            >
              Kategorie (optional)
            </label>
            <input
              id="material-category"
              type="text"
              name="category"
              defaultValue={initialData?.category || ""}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              placeholder="z.B. Ausrüstung, Bekleidung..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label
              htmlFor="material-description"
              className="text-sm font-bold text-slate-700"
            >
              Beschreibung (optional)
            </label>
            <textarea
              id="material-description"
              name="description"
              defaultValue={initialData?.description || ""}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              placeholder="Zusätzliche Infos zum Material..."
            />
          </div>
        </div>
      </div>

      {/* Inventar / Größen */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h3 className="font-bold text-slate-900">Bestand / Größen</h3>
          <p className="text-xs text-slate-500">
            Mindestens ein Bestandseintrag erforderlich.
          </p>
        </div>

        <div className="space-y-3">
          {inventoryItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 items-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`inventory-size-${item.id}`}
                  className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Größe / Variante
                </label>
                <input
                  id={`inventory-size-${item.id}`}
                  type="text"
                  value={item.size}
                  onChange={(e) =>
                    updateInventoryItem(item.id, "size", e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-jdav-green focus:outline-none"
                  placeholder='Wenn leer = "Universal"'
                />
              </div>
              <div className="w-32 space-y-1">
                <label
                  htmlFor={`inventory-quantity-${item.id}`}
                  className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Menge *
                </label>
                <input
                  id={`inventory-quantity-${item.id}`}
                  type="number"
                  min="0"
                  required
                  value={item.quantity_total}
                  onChange={(e) =>
                    updateInventoryItem(
                      item.id,
                      "quantity_total",
                      parseInt(e.target.value, 10),
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-jdav-green focus:outline-none"
                />
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeInventoryItem(item.id)}
                  disabled={inventoryItems.length <= 1}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addInventoryItem}
            className="w-full border-dashed border-2 flex items-center justify-center gap-2 text-slate-600 hover:text-jdav-green hover:border-jdav-green hover:bg-jdav-green/5"
          >
            <Plus className="h-4 w-4" /> Weitere Größe / Variante hinzufügen
          </Button>
        </div>
      </div>

      {/* Gebühren */}
      <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
          Gebühren (Optional)
        </h3>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <label
              htmlFor="price-day"
              className="text-sm font-bold text-slate-700"
            >
              Tagespreis (€)
            </label>
            <input
              id="price-day"
              type="number"
              name="price_day"
              defaultValue={initialData?.pricing?.price_day || ""}
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="price-extra-day"
              className="text-sm font-bold text-slate-700"
            >
              Ab 2. Tag (€)
            </label>
            <input
              id="price-extra-day"
              type="number"
              name="price_extra_day"
              defaultValue={initialData?.pricing?.price_extra_day || ""}
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="price-week"
              className="text-sm font-bold text-slate-700"
            >
              Wochenpreis (€)
            </label>
            <input
              id="price-week"
              type="number"
              name="price_week"
              defaultValue={initialData?.pricing?.price_week || ""}
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/material")}
          className="text-slate-500 hover:text-slate-900 font-bold"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-jdav-green hover:bg-jdav-green-dark text-white font-bold px-6 rounded-xl"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Aktualisieren" : "Material anlegen"}
        </Button>
      </div>
    </form>
  );
}
