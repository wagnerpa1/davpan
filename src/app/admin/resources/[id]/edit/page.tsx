import { notFound, redirect } from "next/navigation";
import { ResourceForm } from "@/app/admin/resources/ResourceForm";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authContext = await getCurrentUserProfile();

  if (authContext.role !== "admin") {
    redirect("/admin/resources");
  }

  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .single();

  if (!resource) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-slate-900 mb-6">
        Ressource bearbeiten
      </h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <ResourceForm initialData={resource} />
      </div>
    </div>
  );
}
