import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { TourForm } from "@/components/tours/TourForm";
import { createTour, getAvailableGuides } from "@/app/actions/tour-management";
import { Mountain } from "lucide-react";

export default async function NewTourPage() {
  const supabase = await createClient();
  const guides = await getAvailableGuides();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    redirect("/touren");
  }

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

      <TourForm onSubmit={createTour} guides={guides} />
    </div>
  );
}
