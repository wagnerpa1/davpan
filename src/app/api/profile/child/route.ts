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
  const name = formData.get("child_name")?.toString();
  const birthdate = formData.get("child_birthdate")?.toString();

  if (!name || !birthdate) {
    return NextResponse.json({ error: "Name and birthdate are required" }, { status: 400 });
  }

  // Add the child to the database
  const { error } = await supabase.from("child_profiles").insert({
    parent_id: session.user.id,
    name,
    birthdate,
  });

  if (error) {
    console.error("Error adding child:", error);
    return NextResponse.json({ error: "Failed to add child" }, { status: 500 });
  }

  // Redirect back to profile page
  return NextResponse.redirect(new URL("/profile", await getServerURL()), {
    status: 303, // See Other (forces GET request after POST)
  });
}
