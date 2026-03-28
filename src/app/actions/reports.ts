"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function upsertReport(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const tourId = formData.get("tourId") as string;
  const title = formData.get("title") as string;
  const text = formData.get("text") as string;
  const reportId = formData.get("reportId") as string | null;
  const imagesJson = formData.get("images") as string | null; // Added

  if (!tourId || !title || !text) {
    return { error: "Titel und Berichtstext sind erforderlich." };
  }

  // Permission check: Admin or Guide of this tour
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    const { data: tourGuide } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", tourId)
      .eq("user_id", user.id)
      .single();

    if (!tourGuide) {
      return { error: "Keine Berechtigung für diese Tour." };
    }
  }

  const reportData = {
    tour_id: tourId,
    title,
    report_text: text,
    created_by: user.id,
  };

  let id = reportId;

  if (reportId) {
    const { error: updateError } = await supabase
      .from("tour_reports")
      .update(reportData)
      .eq("id", reportId);
    if (updateError) return { error: updateError.message };
  } else {
    const { data: newReport, error: insertError } = await supabase
      .from("tour_reports")
      .insert(reportData)
      .select("id")
      .single();
    if (insertError) return { error: insertError.message };
    id = newReport.id;

    // Link images if this is a new report
    if (imagesJson) {
      const imagesToLink = JSON.parse(imagesJson) as {
        url: string;
        order_index: number;
      }[];
      if (imagesToLink.length > 0) {
        const { error: imagesError } = await supabase
          .from("report_images")
          .insert(
            imagesToLink.map((img) => ({
              report_id: id,
              image_url: img.url,
              order_index: img.order_index,
            })),
          );
        if (imagesError) console.error("Error linking images:", imagesError);
      }
    }
  }

  revalidatePath("/berichte");
  revalidatePath(`/berichte/${id}`);
  revalidatePath("/guide/dashboard");
  revalidatePath("/");

  return { success: true, id };
}

export async function uploadImageToStorageOnly(
  tourId: string,
  file: File | Blob,
  originalName?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");

  const name = originalName || (file as File).name || "image.jpg";
  const fileExt = name.split(".").pop() || "jpg";
  const fileName = `temp/${tourId}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: storageError } = await supabase.storage
    .from("tour-reports")
    .upload(filePath, file);

  if (storageError) {
    throw new Error(`Upload fehlgeschlagen: ${storageError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("tour-reports").getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}

export async function uploadReportImage(
  reportId: string,
  file: File | Blob,
  orderIndex: number,
  originalName?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");

  const name = originalName || (file as File).name || "image.jpg";
  const fileExt = name.split(".").pop() || "jpg";
  const fileName = `${reportId}/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: storageError } = await supabase.storage
    .from("tour-reports")
    .upload(filePath, file);

  if (storageError) {
    throw new Error(`Upload fehlgeschlagen: ${storageError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("tour-reports").getPublicUrl(filePath);

  const { data: newImage, error: dbError } = await supabase
    .from("report_images")
    .insert({
      report_id: reportId,
      image_url: publicUrl,
      order_index: orderIndex,
    })
    .select("id")
    .single();

  if (dbError) {
    // Cleanup storage
    await supabase.storage.from("tour-reports").remove([filePath]);
    throw new Error(`DB Error: ${dbError.message}`);
  }

  return { success: true, url: publicUrl, id: newImage.id };
}

export async function deleteReportImage(imageId: string, imageUrl: string) {
  const supabase = await createClient();

  // Extract path from URL
  // Expected: .../storage/v1/object/public/tour-reports/REPROT_ID/filename
  const parts = imageUrl.split("/tour-reports/");
  if (parts.length > 1) {
    const filePath = parts[1];
    await supabase.storage.from("tour-reports").remove([filePath]);
  }

  const { error: dbError } = await supabase
    .from("report_images")
    .delete()
    .eq("id", imageId);

  if (dbError) return { error: dbError.message };

  return { success: true };
}

export async function updateImageOrder(
  images: { id: string; order_index: number }[],
) {
  const supabase = await createClient();

  for (const img of images) {
    await supabase
      .from("report_images")
      .update({ order_index: img.order_index })
      .eq("id", img.id);
  }

  return { success: true };
}

export async function getTourParticipantsForListing(tourId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Check permission
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const { data: isGuide } = await supabase
    .from("tour_guides")
    .select("id")
    .eq("tour_id", tourId)
    .eq("user_id", user.id)
    .single();

  if (!isAdmin && !isGuide) return [];

  const { data: participants } = await supabase
    .from("tour_participants")
    .select(`
      id,
      status,
      user_id,
      child_profile_id,
      profiles (
        full_name,
        phone,
        emergency_phone,
        medical_notes,
        image_consent
      ),
      child_profiles (
        full_name,
        medical_notes,
        image_consent
      )
    `)
    .eq("tour_id", tourId)
    .in("status", ["confirmed", "pending"]);

  return (participants || []).map((p) => ({
    ...p,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
    child_profiles: Array.isArray(p.child_profiles)
      ? p.child_profiles[0]
      : p.child_profiles,
  }));
}
