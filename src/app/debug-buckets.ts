import { createClient } from "@/utils/supabase/server";

export async function checkBuckets() {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error);
    return { error: error.message };
  }
  return { buckets: data.map((b) => b.name) };
}
