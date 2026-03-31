"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function uploadDocument(formData: FormData) {
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

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;

  if (!file || !title || !category) {
    return { error: "Titel, Kategorie und Datei sind erforderlich." };
  }

  // 1. Upload to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `documents/${category}/${fileName}`;

  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (storageError) {
    console.error("Storage upload error:", storageError);
    return { error: `Fehler beim Datei-Upload: ${storageError.message}` };
  }

  // 2. Get Public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(filePath);

  // 3. Insert into Database
  const { error: dbError } = await supabase.from("documents").insert({
    title,
    category,
    file_url: publicUrl,
  });

  if (dbError) {
    console.error("Database insert error:", dbError);
    // Cleanup storage if db fails
    await supabase.storage.from("documents").remove([filePath]);
    return {
      error: `Fehler beim Speichern in der Datenbank: ${dbError.message}`,
    };
  }

  revalidatePath("/dokumente");
  revalidatePath("/admin/dokumente");
  return { success: true };
}

export async function deleteDocument(id: string, fileUrl: string) {
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

  // 1. Try to extract file path from URL to delete from storage
  // The public URL usually looks like .../storage/v1/object/public/documents/documents/category/filename
  // We need the part after "documents/"
  const pathParts = fileUrl.split("/documents/");
  if (pathParts.length > 1) {
    const filePath = pathParts[1];
    await supabase.storage.from("documents").remove([filePath]);
  }

  // 2. Delete from Database
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);
  if (dbError) {
    return {
      error: `Fehler beim Löschen aus der Datenbank: ${dbError.message}`,
    };
  }

  revalidatePath("/dokumente");
  revalidatePath("/admin/dokumente");
  return { success: true };
}
