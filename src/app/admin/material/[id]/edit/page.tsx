import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MaterialForm } from "@/app/admin/material/MaterialForm";
import { canManageMaterial, getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Material bearbeiten - Admin | JDAV Pfarrkirchen",
};

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authContext = await getCurrentUserProfile();
  if (!canManageMaterial(authContext.role)) {
    redirect("/admin/material");
  }
  const supabase = await createClient();

  const { data: materialType, error } = await supabase
    .from("material_types")
    .select(`
      id, name, description, category,
      pricing:material_pricing(*),
      inventory:material_inventory(*)
    `)
    .eq("id", id)
    .single();

  if (error || !materialType) {
    notFound();
  }

  const initialData = {
    id: materialType.id,
    name: materialType.name,
    category: materialType.category,
    description: materialType.description,
    pricing:
      materialType.pricing && materialType.pricing.length > 0
        ? materialType.pricing[0]
        : null,
    inventory: materialType.inventory || [],
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl pb-32">
      <div className="mb-6 flex items-center justify-between text-sm">
        <Link
          href="/admin/material"
          className="text-slate-500 hover:text-jdav-green font-medium"
        >
          &larr; Zurück zum Bestand
        </Link>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="mb-8 text-2xl font-black text-slate-900 sm:text-3xl">
          Material bearbeiten
        </h1>
        <MaterialForm initialData={initialData} />
      </div>
    </div>
  );
}
