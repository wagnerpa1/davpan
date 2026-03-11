import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/login");
  }

  // Fetch active profile for personalization
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.user.id)
    .single();

  const displayName = profile?.full_name || session.user.email?.split('@')[0];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-8 flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Servus, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Willkommen im Mitgliederbereich der Sektion Pfarrkirchen
            </p>
         </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800">Vereins-Neuigkeiten</h2>
        
        {/* Placeholder for the Club Feed (Tour Reports & News) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
           <p>Keine neuen Beiträge vorhanden.</p>
        </div>
      </div>

      {/* Development tool to sign out using a simple form action */}
      <div className="mt-12 flex justify-center">
         <form action="/auth/signout" method="POST">
           <button
             type="submit"
             className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
           >
             <LogOut className="h-4 w-4" />
             Abmelden
           </button>
         </form>
      </div>
    </div>
  );
}
