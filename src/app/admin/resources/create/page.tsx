import { redirect } from "next/navigation";
import { ResourceForm } from "@/app/admin/resources/ResourceForm";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function CreateResourcePage() {
  const authContext = await getCurrentUserProfile();

  if (authContext.role !== "admin") {
    redirect("/admin/resources");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-6">
        Neue Ressource anlegen
      </h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <ResourceForm />
      </div>
    </div>
  );
}
