import React from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { TourForm } from "@/components/tours/TourForm";
import { updateTour, getAvailableGuides } from "@/app/actions/tour-management";
import { Edit } from "lucide-react";

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch tour, profile and available guides in parallel
  const [tourRes, profileRes, guides] = await Promise.all([
    supabase
      .from("tours")
      .select(`
        *,
        tour_guides (user_id)
      `)
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("role").eq("id", session.user.id).single(),
    getAvailableGuides()
  ]);

  if (!tourRes.data) {
    notFound();
  }

  const tour = tourRes.data;
  const userRole = profileRes.data?.role;

  // Check permissions: Admin can edit all. Guide can edit if lead.
  let canEdit = userRole === 'admin';
  if (!canEdit && userRole === 'guide') {
    const { data: leadCheck } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", id)
      .eq("user_id", session.user.id)
      .single();
    
    if (leadCheck || tour.created_by === session.user.id) {
      canEdit = true;
    }
  }

  if (!canEdit) {
    redirect(`/touren/${id}`);
  }

  // Helper for server action with bound ID
  const updateTourWithId = updateTour.bind(null, id);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-jdav-green p-2 text-white">
          <Edit className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Tour bearbeiten
          </h1>
          <p className="text-sm text-slate-500">
            Aktualisiere die Details für: <span className="font-semibold">{tour.title}</span>
          </p>
        </div>
      </div>

      <TourForm 
        initialData={tour} 
        onSubmit={updateTourWithId} 
        guides={guides}
      />
    </div>
  );
}
