import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MaterialForm } from "@/app/admin/material/MaterialForm";
import { canManageMaterial, getCurrentUserProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Neues Material - Admin | JDAV Pfarrkirchen",
};

export default async function CreateMaterialPage() {
  const authContext = await getCurrentUserProfile();
  if (!canManageMaterial(authContext.role)) {
    redirect("/admin/material");
  }
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
          Neues Material anlegen
        </h1>
        <MaterialForm />
      </div>
    </div>
  );
}
