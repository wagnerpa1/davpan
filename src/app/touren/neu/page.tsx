import { Mountain } from "lucide-react";
import { redirect } from "next/navigation";
import { getResources } from "@/app/actions/admin-resources";
import {
  getAvailableGuides,
  getAvailableMaterials,
  getTourCategories,
  getTourGroups,
} from "@/app/actions/tour-management";
import { canCreateTour } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";
import { NewTourFormClient } from "./NewTourFormClient";

export default async function NewTourPage() {
  const [
    supabase,
    guides,
    availableMaterials,
    tourGroups,
    tourCategories,
    availableResources,
  ] = await Promise.all([
    createClient(),
    getAvailableGuides(),
    getAvailableMaterials(),
    getTourGroups(),
    getTourCategories(),
    getResources(),
  ]);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || !canCreateTour(profile.role)) {
    redirect("/touren");
  }

  const currentUser = {
    id: profile.id,
    full_name: profile.full_name,
  };

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-jdav-green p-2 text-white">
          <Mountain className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Neue Tour planen
          </h1>
          <p className="text-sm text-slate-500">
            Erstelle eine neue Aktivität für die Sektion.
          </p>
        </div>
      </div>

      <NewTourFormClient
        guides={guides}
        currentUser={currentUser}
        availableMaterials={availableMaterials}
        availableResources={availableResources}
        tourGroups={tourGroups}
        tourCategories={tourCategories}
      />
    </div>
  );
}
