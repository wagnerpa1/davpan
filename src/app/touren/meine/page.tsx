import Link from "next/link";
import { redirect } from "next/navigation";
import { MyTourRegistrationsPanel } from "@/components/tours/MyTourRegistrationsPanel";
import { getCurrentUserProfile } from "@/lib/auth";
import { loadTourRegistrationOverview } from "@/lib/tours/registration-overview";
import { createClient } from "@/utils/supabase/server";

export default async function MeineTourenPage() {
  const [{ user, role }, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const overview = await loadTourRegistrationOverview(
    supabase,
    user.id,
    role === "parent",
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/touren"
          className="text-sm font-medium text-slate-500 hover:text-jdav-green"
        >
          &larr; Zurück zum Tourenprogramm
        </Link>
      </div>

      <MyTourRegistrationsPanel tabs={overview.tabs} />
    </div>
  );
}
