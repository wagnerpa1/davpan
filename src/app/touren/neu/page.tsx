import { AlertTriangle, Mountain } from "lucide-react";
import { redirect } from "next/navigation";
import { getResources } from "@/app/actions/admin-resources";
import {
  createTour,
  getAvailableGuides,
  getAvailableMaterials,
  getTourCategories,
  getTourGroups,
} from "@/app/actions/tour-management";
import { TourForm } from "@/components/tours/TourForm";
import { createClient } from "@/utils/supabase/server";

export default async function NewTourPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const errorRaw = params?.error;
  const debugRaw = params?.debug;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;
  const debug = Array.isArray(debugRaw) ? debugRaw[0] : debugRaw;

  const supabase = await createClient();
  const guides = await getAvailableGuides();
  const availableMaterials = await getAvailableMaterials();
  const tourGroups = await getTourGroups();
  const tourCategories = await getTourCategories();
  const availableResources = await getResources();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Check role and get name
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    redirect("/touren");
  }

  const currentUser = {
    id: profile.id,
    full_name: profile.full_name,
  };

  const errorTextMap: Record<string, string> = {
    missing_required: "Bitte fülle mindestens Titel und Startdatum aus.",
    create_failed:
      "Die Tour konnte nicht gespeichert werden. Bitte prüfe die Eingaben.",
    forbidden: "Du hast keine Berechtigung, Touren zu erstellen.",
  };

  const errorMessage = error
    ? (errorTextMap[error] ?? "Unbekannter Fehler.")
    : null;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
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

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="text-sm font-semibold">Speichern fehlgeschlagen</p>
              <p className="text-sm">{errorMessage}</p>
              {debug && (
                <p className="mt-2 text-xs text-red-700">
                  Technischer Hinweis (temp): {decodeURIComponent(debug)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <TourForm
        onSubmit={createTour}
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
