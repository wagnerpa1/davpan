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
  role: string;
}>;

export async function POST(req: NextRequest) {
  const isAsyncRequest =
    req.headers.get("x-requested-with") === "XMLHttpRequest";

  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
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
  const role = formData.get("role")?.toString();

  // Validate role if provided (only members and parents can self-assign)
  const ALLOWED_SELF_ROLES = ["member", "parent"];
  if (role !== undefined && !ALLOWED_SELF_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Only 'member' and 'parent' are allowed." },
      { status: 400 },
    );
  }

  const updatePayload: ProfileUpdatePayload = {};
  if (full_name !== undefined) updatePayload.full_name = full_name;
  if (phone !== undefined) updatePayload.phone = phone;
  if (emergency_phone !== undefined)
    updatePayload.emergency_phone = emergency_phone;
  if (birthdate !== undefined) updatePayload.birthdate = birthdate;
  if (medical_notes !== undefined) updatePayload.medical_notes = medical_notes;
  if (role !== undefined) updatePayload.role = role;
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

  if (isAsyncRequest) {
    return NextResponse.json({ success: true, saved: "profile" });
  }

  return NextResponse.redirect(
    new URL("/profile?saved=profile", await getServerURL()),
    {
      status: 303,
    },
  );
}
