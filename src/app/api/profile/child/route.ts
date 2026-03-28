import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

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
  const childId = formData.get("child_id")?.toString();
  const name = formData.get("child_name")?.toString();
  const birthdate = formData.get("child_birthdate")?.toString();
  const medicalNotes = formData.get("medical_notes")?.toString();
  const imageConsent = formData.get("image_consent") === "on";

  if (!name || !birthdate) {
    return NextResponse.json(
      { error: "Name and birthdate are required" },
      { status: 400 },
    );
  }

  let savedAction: "child_updated" | "child_created" = "child_created";

  if (childId) {
    savedAction = "child_updated";
    // Update existing child
    const { error } = await supabase
      .from("child_profiles")
      .update({
        full_name: name,
        birthdate,
        medical_notes: medicalNotes,
        image_consent: imageConsent,
      })
      .eq("id", childId)
      .eq("parent_id", user.id);

    if (error) {
      console.error("Error updating child:", error);
      return NextResponse.json(
        { error: "Failed to update child" },
        { status: 500 },
      );
    }
  } else {
    // Add new child
    const { error } = await supabase.from("child_profiles").insert({
      parent_id: user.id,
      full_name: name,
      birthdate,
      medical_notes: medicalNotes,
      image_consent: imageConsent,
    });

    if (error) {
      console.error("Error adding child:", error);
      return NextResponse.json(
        { error: "Failed to add child" },
        { status: 500 },
      );
    }
  }

  // Redirect back to profile page
  const redirectPath =
    savedAction === "child_updated" && childId
      ? `/profile?saved=${savedAction}&child_id=${childId}`
      : `/profile?saved=${savedAction}`;

  if (isAsyncRequest) {
    return NextResponse.json({
      success: true,
      saved: savedAction,
      child_id: savedAction === "child_updated" ? childId : null,
    });
  }

  return NextResponse.redirect(new URL(redirectPath, await getServerURL()), {
    status: 303, // See Other (forces GET request after POST)
  });
}
