"use server";

import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

type LookupTableName = "tour_categorys" | "tour_groups";

interface AdminAuthResult {
  supabase: Awaited<ReturnType<typeof createClient>>;
  error: string | null;
}

function normalizeValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, error: "Nicht eingeloggt." } satisfies AdminAuthResult;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    return {
      supabase,
      error: "Keine Berechtigung. Nur Admins dürfen diese Einträge verwalten.",
    } satisfies AdminAuthResult;
  }

  return { supabase, error: null } satisfies AdminAuthResult;
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
  tableName: LookupTableName,
  columnName: "category" | "group_name",
  formData: FormData,
) {
  const auth = await requireAdmin();

  if (auth.error) {
    return { error: auth.error };
  }

  const id = normalizeValue(formData.get("id"));
  const value = normalizeValue(formData.get(columnName));

  if (!value) {
    return { error: "Der Name darf nicht leer sein." };
  }

  const payload = { [columnName]: value } as Record<string, string>;

  if (id) {
    const { error } = await auth.supabase
      .from(tableName)
      .update(payload)
      .eq("id", id);

    if (error) {
      return { error: `Speichern fehlgeschlagen: ${error.message}` };
    }
  } else {
    const { error } = await auth.supabase.from(tableName).insert(payload);

    if (error) {
      return { error: `Anlegen fehlgeschlagen: ${error.message}` };
    }
  }

  revalidateTourMetadataPaths();
  return { success: true };
}

async function deleteLookupEntry(tableName: LookupTableName, id: string) {
  const auth = await requireAdmin();

  if (auth.error) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase.from(tableName).delete().eq("id", id);

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
  return upsertLookupEntry("tour_categorys", "category", formData);
}

export async function deleteTourCategory(id: string) {
  if (!id) {
    return { error: "ID fehlt." };
  }

  return deleteLookupEntry("tour_categorys", id);
}

export async function saveTourGroup(formData: FormData) {
  return upsertLookupEntry("tour_groups", "group_name", formData);
}

export async function deleteTourGroup(id: string) {
  if (!id) {
    return { error: "ID fehlt." };
  }

  return deleteLookupEntry("tour_groups", id);
}