"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/permissions";
import type { createClient } from "@/utils/supabase/server";
import { requireAuth } from "./auth-guards";

type LookupTableName = "tour_categorys" | "tour_groups";

interface AdminAuthResult {
  supabase: Awaited<ReturnType<typeof createClient>>;
  error: string | null;
}

function normalizeValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

async function requireAdmin(
  auth: Awaited<ReturnType<typeof requireAuth>>,
): Promise<AdminAuthResult> {
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    return {
      supabase: auth.supabase,
      error: "Keine Berechtigung. Nur Admins dürfen diese Einträge verwalten.",
    } satisfies AdminAuthResult;
  }

  return { supabase: auth.supabase, error: null };
}

function revalidateTourMetadataPaths() {
  const paths = [
    "/admin/touren-meta",
    "/touren",
    "/touren/neu",
    "/admin/news",
    "/berichte",
    "/profile",
    "/guide/dashboard",
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}

async function upsertLookupEntry(
  auth: Awaited<ReturnType<typeof requireAuth>>,
  tableName: LookupTableName,
  columnName: "category" | "group_name",
  formData: FormData,
) {
  const admin = await requireAdmin(auth);

  if (admin.error) {
    return { error: admin.error };
  }

  const id = normalizeValue(formData.get("id"));
  const value = normalizeValue(formData.get(columnName));

  if (!value) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const payload = { [columnName]: value } as Record<string, string>;

  if (id) {
    const { error } = await admin.supabase
      .from(tableName)
      .update(payload)
      .eq("id", id);

    if (error) {
      return { error: `Speichern fehlgeschlagen: ${error.message}` };
    }
  } else {
    const { error } = await admin.supabase.from(tableName).insert(payload);

    if (error) {
      return { error: `Anlegen fehlgeschlagen: ${error.message}` };
    }
  }

  revalidateTourMetadataPaths();
  return { success: true };
}

async function deleteLookupEntry(
  auth: Awaited<ReturnType<typeof requireAuth>>,
  tableName: LookupTableName,
  id: string,
) {
  const admin = await requireAdmin(auth);

  if (admin.error) {
    return { error: admin.error };
  }

  const { error } = await admin.supabase.from(tableName).delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Der Eintrag wird noch von Touren verwendet und kann deshalb nicht gelöscht werden.",
      };
    }

    return { error: `Löschen fehlgeschlagen: ${error.message}` };
  }

  revalidateTourMetadataPaths();
  return { success: true };
}

export async function saveTourCategory(formData: FormData) {
  const auth = await requireAuth();
  return upsertLookupEntry(auth, "tour_categorys", "category", formData);
}

export async function deleteTourCategory(id: string) {
  const auth = await requireAuth();
  if (!id) {
    return { error: "ID fehlt." };
  }

  return deleteLookupEntry(auth, "tour_categorys", id);
}

export async function saveTourGroup(formData: FormData) {
  const auth = await requireAuth();
  return upsertLookupEntry(auth, "tour_groups", "group_name", formData);
}

export async function deleteTourGroup(id: string) {
  const auth = await requireAuth();
  if (!id) {
    return { error: "ID fehlt." };
  }

  return deleteLookupEntry(auth, "tour_groups", id);
}
