"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function deleteMyAccount() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Nicht autorisiert.");
  }

  const { createClient: createAdminClient } = await import(
    "@supabase/supabase-js"
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Serverkonfiguration unvollständig.");
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Personenbezogene Daten maskieren, damit Historie und Referenzen erhalten bleiben.
  const { error: maskError } = await adminClient
    .from("profiles")
    .update({
      full_name: "Gelöschter Nutzer",
      phone: null,
      birthdate: null,
      medical_notes: null,
      emergency_phone: null,
      image_consent: false,
      role: "member",
    })
    .eq("id", user.id);

  if (maskError) {
    console.error("Profil konnte nicht maskiert werden:", maskError);
    throw new Error("Fehler bei der Kontoanonymisierung.");
  }

  // 2) Push-Abos entfernen, um nach Löschung keine Zustellungen mehr zu versuchen.
  await adminClient.from("push_subscriptions").delete().eq("user_id", user.id);

  // 3) Auth-Account löschen, damit kein erneuter Login möglich ist.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );

  if (deleteError) {
    console.error("Account konnte nicht geloescht werden:", deleteError);
    throw new Error("Fehler beim Loeschen des Accounts.");
  }

  await supabase.auth.signOut();
  revalidatePath("/profile");
  revalidatePath("/");
  redirect("/?deleted=true");
}
