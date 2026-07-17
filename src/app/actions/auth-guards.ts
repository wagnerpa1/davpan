import { DomainError } from "@/lib/errors";
import { createClient } from "@/utils/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new DomainError("unauthorized", "Nicht autorisiert");
  }

  return { supabase, user };
}
