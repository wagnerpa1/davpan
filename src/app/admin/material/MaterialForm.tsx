"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrUpdateMaterialGroup } from "@/app/actions/admin-material.server";
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

function MaterialFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function InventoryItemRow({
  item,
  isOnlyEntry,
  onSizeChange,
  onQuantityChange,
  onRemove,
}: {
  item: InventoryItem;
  isOnlyEntry: boolean;
  onSizeChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-4 items-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
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
          onChange={(e) => onSizeChange(e.target.value)}
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
          onChange={(e) => onQuantityChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:border-jdav-green focus:outline-none"
        />
      </div>
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={onRemove}
          disabled={isOnlyEntry}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PricingSection({
  initialData,
}: {
  initialData?: MaterialFormProps["initialData"];
}) {
  return (
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
            defaultValue={initialData?.pricing?.price_day ?? ""}
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
            defaultValue={initialData?.pricing?.price_extra_day ?? ""}
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
            defaultValue={initialData?.pricing?.price_week ?? ""}
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-slate-200 px-4 py-2 focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>
      </div>
    </div>
  );
}

export function MaterialForm({ initialData }: MaterialFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setInventoryItems((items) => [
      ...items,
      { id: crypto.randomUUID(), size: "", quantity_total: 1 },
    ]);
  };

  const removeInventoryItem = (id: string) => {
    setInventoryItems((items) => {
      if (items.length === 1) return items;
      return items.filter((item) => item.id !== id);
    });
  };

  const updateInventoryItem = (
    id: string,
    field: keyof InventoryItem,
    value: InventoryItem[keyof InventoryItem],
  ) => {
    setInventoryItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      const typeData = {
        id: initialData?.id,
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        description: formData.get("description") as string,
      };

      const rawPriceDay = formData.get("price_day");
      const rawPriceExtraDay = formData.get("price_extra_day");
      const rawPriceWeek = formData.get("price_week");

      const price_day =
        rawPriceDay &&
        rawPriceDay !== "" &&
        Number.isFinite(Number(rawPriceDay))
          ? Number(rawPriceDay)
          : null;
      const price_extra_day =
        rawPriceExtraDay &&
        rawPriceExtraDay !== "" &&
        Number.isFinite(Number(rawPriceExtraDay))
          ? Number(rawPriceExtraDay)
          : null;
      const price_week =
        rawPriceWeek &&
        rawPriceWeek !== "" &&
        Number.isFinite(Number(rawPriceWeek))
          ? Number(rawPriceWeek)
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

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/admin/material");
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      <MaterialFormSection title="Allgemein">
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
      </MaterialFormSection>

      <MaterialFormSection
        title="Bestand / Größen"
        description="Mindestens ein Bestandseintrag erforderlich."
      >
        <div className="space-y-3">
          {inventoryItems.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              isOnlyEntry={inventoryItems.length <= 1}
              onSizeChange={(value) =>
                updateInventoryItem(item.id, "size", value)
              }
              onQuantityChange={(value) => {
                const parsedValue =
                  value === "" ? 0 : Number.parseInt(value, 10);
                updateInventoryItem(
                  item.id,
                  "quantity_total",
                  Number.isFinite(parsedValue) ? parsedValue : 0,
                );
              }}
              onRemove={() => removeInventoryItem(item.id)}
            />
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
      </MaterialFormSection>

      <PricingSection initialData={initialData} />

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
