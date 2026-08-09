"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function activateCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_activated: true, activated: true })
    .eq("id", user.id);

  if (error) {
    throw new Error("Aktivierung fehlgeschlagen.");
  }

  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/");
}
