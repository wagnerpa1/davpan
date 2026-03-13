import { createClient } from "@/utils/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { getServerURL } from "@/utils/url-helpers";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const full_name = formData.get("full_name")?.toString();
  const phone = formData.get("phone")?.toString();
  const emergency_phone = formData.get("emergency_phone")?.toString();
  const birthdate = formData.get("birthdate")?.toString();
  const medical_notes = formData.get("medical_notes")?.toString();
  const image_consent = formData.get("image_consent") === "on";

  const updatePayload: any = {};
  if (full_name !== undefined) updatePayload.full_name = full_name;
  if (phone !== undefined) updatePayload.phone = phone;
  if (emergency_phone !== undefined) updatePayload.emergency_phone = emergency_phone;
  if (birthdate !== undefined) updatePayload.birthdate = birthdate;
  if (medical_notes !== undefined) updatePayload.medical_notes = medical_notes;
  updatePayload.image_consent = image_consent;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", session.user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile", details: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/profile", await getServerURL()), {
    status: 303,
  });
}
