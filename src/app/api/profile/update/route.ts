import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

type ProfileUpdatePayload = Partial<{
  full_name: string;
  phone: string;
  emergency_phone: string;
  birthdate: string;
  medical_notes: string;
  image_consent: boolean;
}>;

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const full_name = formData.get("full_name")?.toString();
  const phone = formData.get("phone")?.toString();
  const emergency_phone = formData.get("emergency_phone")?.toString();
  const birthdate = formData.get("birthdate")?.toString();
  const medical_notes = formData.get("medical_notes")?.toString();
  const image_consent = formData.get("image_consent") === "on";

  const updatePayload: ProfileUpdatePayload = {};
  if (full_name !== undefined) updatePayload.full_name = full_name;
  if (phone !== undefined) updatePayload.phone = phone;
  if (emergency_phone !== undefined)
    updatePayload.emergency_phone = emergency_phone;
  if (birthdate !== undefined) updatePayload.birthdate = birthdate;
  if (medical_notes !== undefined) updatePayload.medical_notes = medical_notes;
  updatePayload.image_consent = image_consent;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.redirect(new URL("/profile", await getServerURL()), {
    status: 303,
  });
}
