import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch complete user profile from public.profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If role is parent, fetch children
  let children: any[] = [];
  if (profile?.role === "parent") {
    const { data: fetchChildren } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("parent_id", user.id);
    children = fetchChildren || [];
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        Profil & Einstellungen
      </h1>
      
      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-semibold">Persönliche Daten</h2>
          <p className="text-sm text-slate-500">Verwalte deine Mitgliedsdaten und Kontakte.</p>
        </div>
        
        <form action="/api/profile/update" method="POST" className="space-y-4">
           {/* In future steps: Add full edit form with emergency contact and medical info */}
           <div>
             <label className="block text-sm font-medium text-slate-700">Email</label>
             <input 
               type="text" 
               disabled 
               defaultValue={user.email} 
               className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500" 
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700">Name</label>
             <input 
               type="text" 
               name="full_name"
               defaultValue={profile?.full_name || ""} 
               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
               placeholder="Dein Vor- und Nachname"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700">Konto-Typ / Rolle</label>
             <input 
               type="text" 
               disabled 
               defaultValue={profile?.role === 'parent' ? 'Elternkonto' : (profile?.role === 'guide' ? 'Tourenleiter (Guide)' : (profile?.role === 'admin' ? 'Administrator' : 'Mitglied'))} 
               className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 capitalize" 
             />
           </div>

           {profile?.role !== 'parent' && (
             <div>
               <label className="block text-sm font-medium text-slate-700">Geburtsdatum</label>
               <input 
                 type="date" 
                 name="birthdate"
                 defaultValue={profile?.birthdate || ""} 
                 className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
               />
             </div>
           )}
           
           <div>
             <label className="block text-sm font-medium text-slate-700">Persönliche Telefonnummer</label>
             <input 
               type="tel" 
               name="phone"
               defaultValue={profile?.phone || ""} 
               placeholder="Deine Handynummer"
               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700">Notfallkontakt (Telefon)</label>
             <input 
               type="tel" 
               name="emergency_phone"
               defaultValue={profile?.emergency_phone || ""} 
               placeholder="Wird nur Guides angezeigt"
               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700">Medizinische Hinweise</label>
             <textarea 
               name="medical_notes"
               defaultValue={profile?.medical_notes || ""} 
               placeholder="Allergien, Medikamente etc. (nur für Guides sichtbar)"
               rows={3}
               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
             />
           </div>

           <button 
             type="submit" 
             className="inline-flex w-full items-center justify-center rounded-md bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
           >
             Profil speichern
           </button>
        </form>
      </div>

      {profile?.role === "parent" && (
        <div className="mt-8 space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div>
            <h2 className="text-xl font-semibold">Meine Kinder</h2>
            <p className="text-sm text-slate-500">
              Verwalte die Profile deiner Kinder, um sie für Touren anzumelden.
            </p>
          </div>

          {children.length > 0 ? (
            <div className="space-y-6">
              {children.map((child) => (
                <div key={child.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                      <div>
                        <span className="block font-bold text-slate-900">{child.full_name}</span>
                        <span className="text-xs text-slate-500">Geburtsdatum: {child.birthdate}</span>
                      </div>
                      <span className="text-xs font-semibold text-jdav-green group-open:text-slate-400">
                        {/* Summary shows status or edit hint */}
                        Details / Bearbeiten
                      </span>
                    </summary>
                    <div className="p-4 bg-white border-t border-slate-100">
                      <form action="/api/profile/child" method="POST" className="space-y-4">
                        <input type="hidden" name="child_id" value={child.id} />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                           <div>
                             <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Name</label>
                             <input 
                               type="text" 
                               name="child_name"
                               defaultValue={child.full_name}
                               required
                               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Geburtsdatum</label>
                             <input 
                               type="date" 
                               name="child_birthdate"
                               defaultValue={child.birthdate}
                               required
                               className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                             />
                           </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Medizinische Hinweise</label>
                          <textarea 
                            name="medical_notes"
                            defaultValue={child.medical_notes || ""}
                            placeholder="Allergien, Medikamente etc."
                            rows={2}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                          />
                        </div>
                        <div className="flex justify-end">
                          <button 
                            type="submit" 
                            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                          >
                            Änderungen speichern
                          </button>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Du hast noch keine Kinderprofile angelegt.
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-8">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Neues Kind hinzufügen</h3>
            <form action="/api/profile/child" method="POST" className="space-y-4 rounded-2xl bg-slate-50 p-6 border border-slate-100">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <div>
                   <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Name</label>
                   <input 
                     type="text" 
                     name="child_name"
                     placeholder="Vor- und Nachname"
                     required
                     className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Geburtsdatum</label>
                   <input 
                     type="date" 
                     name="child_birthdate"
                     required
                     className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                   />
                 </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wider">Medizinische Hinweise</label>
                <textarea 
                  name="medical_notes"
                  placeholder="Z.B. Asthma, Nussallergie..."
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green" 
                />
              </div>
              <button 
                type="submit" 
                className="inline-flex w-full items-center justify-center rounded-xl bg-jdav-green px-4 py-2.5 text-sm font-black text-white shadow-md transition-all hover:bg-jdav-green-dark hover:shadow-lg"
              >
                Kind hinzufügen
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
