"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface MaterialInventoryRow {
  id: string;
  size: string | null;
  quantity_total: number;
  quantity_available: number;
}

export async function createOrUpdateMaterialGroup(
  typeData: {
    id?: string;
    name: string;
    category?: string;
    description?: string;
  },
  pricingData: {
    price_day?: number | null;
    price_extra_day?: number | null;
    price_week?: number | null;
  },
  inventoryData: { size: string | null; quantity_total: number }[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "Keine Berechtigung (nur Admin)." };
  }

  if (!typeData.name) {
    return { error: "Name ist erforderlich." };
  }

  let materialTypeId = typeData.id;

  // 1. Create or Update material_types
  if (materialTypeId) {
    const { error } = await supabase
      .from("material_types")
      .update({
        name: typeData.name,
        category: typeData.category || null,
        description: typeData.description || null,
      })
      .eq("id", materialTypeId);
    if (error)
      return {
        error: `Fehler beim Aktualisieren des Materialtyps: ${error.message}`,
      };
  } else {
    const { data: newType, error } = await supabase
      .from("material_types")
      .insert({
        name: typeData.name,
        category: typeData.category || null,
        description: typeData.description || null,
      })
      .select("id")
      .single();
    if (error || !newType)
      return {
        error: `Fehler beim Erstellen des Materialtyps: ${error?.message || ""}`,
      };
    materialTypeId = newType.id;
  }

  if (!materialTypeId) {
    return { error: "Materialtyp konnte nicht ermittelt werden." };
  }

  // 2. Handle Pricing
  // Check if pricing exists
  const { data: existingPricing } = await supabase
    .from("material_pricing")
    .select("id")
    .eq("material_type_id", materialTypeId)
    .single();

  const pricePayload = {
    material_type_id: materialTypeId,
    price_day: pricingData.price_day ?? null,
    price_extra_day: pricingData.price_extra_day ?? null,
    price_week: pricingData.price_week ?? null,
  };

  if (existingPricing) {
    await supabase
      .from("material_pricing")
      .update(pricePayload)
      .eq("id", existingPricing.id);
  } else {
    await supabase.from("material_pricing").insert(pricePayload);
  }

  // 3. Handle Inventory. (For simplicity, delete old and insert new, since sizes might have changed entirely.
  // Wait, if we delete them, reservations pointing to them will break if they casade or error on restrict.
  // Instead, let's just insert new ones or update if we have a way to match size.
  // A safer approach: fetch existing, update matching sizes, insert new ones, don't delete to avoid breaking historical data.
  const { data: existingInv } = await supabase
    .from("material_inventory")
    .select("*")
    .eq("material_type_id", materialTypeId);

  const existingInventory = (existingInv || []) as MaterialInventoryRow[];

  for (const inv of inventoryData) {
    const match = existingInventory.find(
      (entry) => entry.size === inv.size || (!entry.size && !inv.size),
    );
    if (match) {
      // update quantity (assume available scales accordingly)
      const diff = inv.quantity_total - match.quantity_total;
      await supabase
        .from("material_inventory")
        .update({
          quantity_total: inv.quantity_total,
          quantity_available: Math.max(0, match.quantity_available + diff),
        })
        .eq("id", match.id);
    } else {
      // insert new
      await supabase.from("material_inventory").insert({
        material_type_id: materialTypeId,
        size: inv.size || null,
        quantity_total: inv.quantity_total,
        quantity_available: inv.quantity_total,
      });
    }
  }

  // NOTE: Cleanup of old sizes that are no longer sent isn't done here because they might have reservations.
  // We can just set their quantity_available/total to 0 instead of deleting.
  if (existingInventory.length > 0) {
    for (const old of existingInventory) {
      const isSent = inventoryData.some(
        (nv) => nv.size === old.size || (!nv.size && !old.size),
      );
      if (!isSent) {
        await supabase
          .from("material_inventory")
          .update({ quantity_total: 0, quantity_available: 0 })
          .eq("id", old.id);
      }
    }
  }

  revalidatePath("/admin/material");
  return { success: true };
}

export async function deleteMaterialType(typeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "Keine Berechtigung (nur Admin)." };
  }

  // Deleting a material type needs to delete pricing and inventory first (or CASCADE)
  await supabase
    .from("material_pricing")
    .delete()
    .eq("material_type_id", typeId);
  await supabase
    .from("material_inventory")
    .delete()
    .eq("material_type_id", typeId);

  const { error } = await supabase
    .from("material_types")
    .delete()
    .eq("id", typeId);

  if (error) {
    console.error("Delete material error: ", error);
    return {
      error:
        "Fehler beim Löschen. Möglicherweise existieren aktive Reservierungen!",
    };
  }

  revalidatePath("/admin/material");
  return { success: true };
}
