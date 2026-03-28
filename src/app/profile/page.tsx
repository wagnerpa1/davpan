import { redirect } from "next/navigation";
import {
  type NotificationPreference,
  NotificationPreferencesPanel,
  type TourGroupItem,
} from "@/components/profile/NotificationPreferencesPanel";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";
import { AsyncForm } from "@/components/ui/AsyncForm";
import { createClient } from "@/utils/supabase/server";

interface ChildProfile {
  id: string;
  full_name: string;
  birthdate: string;
  medical_notes: string | null;
  image_consent: boolean | null;
}

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
  let children: ChildProfile[] = [];
  if (profile?.role === "parent") {
    const { data: fetchChildren } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("parent_id", user.id);
    children = fetchChildren || [];
  }

  const defaultPreferences: NotificationPreference = {
    news_enabled: true,
    system_enabled: true,
    material_enabled: true,
    comments_enabled: true,
    group_notifications_enabled: true,
    push_enabled: false,
    tour_group_ids: [],
  };

  const [{ data: userNotificationPreferences }, { data: tourGroups }] =
    await Promise.all([
      supabase
        .from("notification_preferences")
        .select(
          "news_enabled, system_enabled, material_enabled, comments_enabled, group_notifications_enabled, push_enabled, tour_group_ids",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("tour_groups")
        .select("id, group_name")
        .order("group_name", { ascending: true }),
    ]);

  const ownPreferences: NotificationPreference = {
    ...defaultPreferences,
    ...userNotificationPreferences,
    tour_group_ids: userNotificationPreferences?.tour_group_ids ?? [],
  };

  const childPreferenceById = new Map<string, NotificationPreference>();

  if (children.length > 0) {
    const childIds = children.map((child) => child.id);
    const { data: childPreferences } = await supabase
      .from("child_notification_preferences")
      .select(
        "child_id, news_enabled, system_enabled, material_enabled, comments_enabled, group_notifications_enabled, push_enabled, tour_group_ids",
      )
      .in("child_id", childIds);

    for (const row of childPreferences ?? []) {
      childPreferenceById.set(row.child_id, {
        news_enabled: row.news_enabled,
        system_enabled: row.system_enabled,
        material_enabled: row.material_enabled,
        comments_enabled: row.comments_enabled,
        group_notifications_enabled: row.group_notifications_enabled,
        push_enabled: row.push_enabled,
        tour_group_ids: row.tour_group_ids ?? [],
      });
    }
  }

  const childNotificationPreferences = children.map((child) => ({
    id: child.id,
    full_name: child.full_name,
    preferences: childPreferenceById.get(child.id) ?? defaultPreferences,
  }));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">
        Profil & Einstellungen
      </h1>

      <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-semibold">Persönliche Daten</h2>
          <p className="text-sm text-slate-500">
            Verwalte deine Mitgliedsdaten und Kontakte.
          </p>
        </div>

        <AsyncForm
          action="/api/profile/update"
          method="POST"
          successKey="profile"
          className="space-y-5"
        >
          {/* In future steps: Add full edit form with emergency contact and medical info */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="text"
              disabled
              defaultValue={user.email}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-full-name"
              className="block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              name="full_name"
              defaultValue={profile?.full_name || ""}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              placeholder="Dein Vor- und Nachname"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-role-display"
              className="block text-sm font-medium text-slate-700"
            >
              Konto-Typ / Rolle
            </label>
            <input
              id="profile-role-display"
              type="text"
              disabled
              defaultValue={
                profile?.role === "parent"
                  ? "Elternkonto"
                  : profile?.role === "guide"
                    ? "Tourenleiter (Guide)"
                    : profile?.role === "materialwart"
                      ? "Materialwart"
                      : profile?.role === "admin"
                        ? "Administrator"
                        : "Mitglied"
              }
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 capitalize"
            />
          </div>

          {profile?.role !== "parent" && (
            <div className="space-y-1.5">
              <label
                htmlFor="profile-birthdate"
                className="block text-sm font-medium text-slate-700"
              >
                Geburtsdatum
              </label>
              <input
                id="profile-birthdate"
                type="date"
                name="birthdate"
                defaultValue={profile?.birthdate || ""}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium text-slate-700"
            >
              Persönliche Telefonnummer
            </label>
            <input
              id="profile-phone"
              type="tel"
              name="phone"
              defaultValue={profile?.phone || ""}
              placeholder="Deine Handynummer"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-emergency-phone"
              className="block text-sm font-medium text-slate-700"
            >
              Notfallkontakt (Telefon)
            </label>
            <input
              id="profile-emergency-phone"
              type="tel"
              name="emergency_phone"
              defaultValue={profile?.emergency_phone || ""}
              placeholder="Wird nur Guides angezeigt"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-medical-notes"
              className="block text-sm font-medium text-slate-700"
            >
              Medizinische Hinweise
            </label>
            <textarea
              id="profile-medical-notes"
              name="medical_notes"
              defaultValue={profile?.medical_notes || ""}
              placeholder="Allergien, Medikamente etc. (nur für Guides sichtbar)"
              rows={3}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="image_consent"
                defaultChecked={profile?.image_consent}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
              />
              <div className="text-sm">
                <span className="font-bold text-slate-900">
                  Einwilligung zur Verwendung von Bildern
                </span>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Ich erkläre mich damit einverstanden, dass Fotos von mir, die
                  im Rahmen von Vereinsaktivitäten entstehen, auf der Webseite,
                  in Druckerzeugnissen oder Social-Media-Kanälen der Sektion
                  veröffentlicht werden dürfen.
                </p>
              </div>
            </label>
          </div>

          <AnimatedSubmitButton
            successKey="profile"
            successLabel="Gespeichert"
            className="inline-flex w-full items-center justify-center rounded-md bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
          >
            Profil speichern
          </AnimatedSubmitButton>
        </AsyncForm>
      </div>

      <NotificationPreferencesPanel
        ownPreferences={ownPreferences}
        tourGroups={(tourGroups as TourGroupItem[] | null) ?? []}
        childPreferences={childNotificationPreferences}
      />

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
                <div
                  key={child.id}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                      <div>
                        <span className="block font-bold text-slate-900">
                          {child.full_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          Geburtsdatum: {child.birthdate}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-jdav-green group-open:text-slate-400">
                        {/* Summary shows status or edit hint */}
                        Details / Bearbeiten
                      </span>
                    </summary>
                    <div className="p-4 bg-white border-t border-slate-100">
                      <AsyncForm
                        action="/api/profile/child"
                        method="POST"
                        successKey="child_updated"
                        successChildId={child.id}
                        className="space-y-5"
                      >
                        <input type="hidden" name="child_id" value={child.id} />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label
                              htmlFor={`${child.id}-child-name`}
                              className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                            >
                              Name
                            </label>
                            <input
                              id={`${child.id}-child-name`}
                              type="text"
                              name="child_name"
                              defaultValue={child.full_name}
                              required
                              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              htmlFor={`${child.id}-child-birthdate`}
                              className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                            >
                              Geburtsdatum
                            </label>
                            <input
                              id={`${child.id}-child-birthdate`}
                              type="date"
                              name="child_birthdate"
                              defaultValue={child.birthdate}
                              required
                              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label
                            htmlFor={`${child.id}-medical-notes`}
                            className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                          >
                            Medizinische Hinweise
                          </label>
                          <textarea
                            id={`${child.id}-medical-notes`}
                            name="medical_notes"
                            defaultValue={child.medical_notes || ""}
                            placeholder="Allergien, Medikamente etc."
                            rows={2}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                          />
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="image_consent"
                              defaultChecked={child.image_consent ?? false}
                              className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                            />
                            <div className="text-[11px] leading-tight text-slate-600">
                              <span className="font-bold text-slate-900">
                                Einwilligung zur Bildverwendung
                              </span>
                              <p className="mt-0.5">
                                Ich erlaube die Verwendung von Fotos dieses
                                Kindes für Vereinszwecke.
                              </p>
                            </div>
                          </label>
                        </div>
                        <div className="flex justify-end">
                          <AnimatedSubmitButton
                            successKey="child_updated"
                            successChildId={child.id}
                            successLabel="Gespeichert"
                            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                          >
                            Änderungen speichern
                          </AnimatedSubmitButton>
                        </div>
                      </AsyncForm>
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
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              Neues Kind hinzufügen
            </h3>
            <AsyncForm
              action="/api/profile/child"
              method="POST"
              successKey="child_created"
              className="space-y-5 rounded-2xl bg-slate-50 p-6 border border-slate-100"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-child-name"
                    className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                  >
                    Name
                  </label>
                  <input
                    id="new-child-name"
                    type="text"
                    name="child_name"
                    placeholder="Vor- und Nachname"
                    required
                    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-child-birthdate"
                    className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                  >
                    Geburtsdatum
                  </label>
                  <input
                    id="new-child-birthdate"
                    type="date"
                    name="child_birthdate"
                    required
                    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="new-child-medical-notes"
                  className="block text-xs font-medium text-slate-700 uppercase tracking-wider"
                >
                  Medizinische Hinweise
                </label>
                <textarea
                  id="new-child-medical-notes"
                  name="medical_notes"
                  placeholder="Z.B. Asthma, Nussallergie..."
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="image_consent"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                  />
                  <div className="text-xs leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-900 uppercase tracking-wider">
                      Bild-Einwilligung erteilen
                    </span>
                    <p className="mt-1">
                      Hiermit willige ich in die Veröffentlichung von
                      Bildmaterial meines Kindes für Vereinszwecke ein.
                    </p>
                  </div>
                </label>
              </div>
              <AnimatedSubmitButton
                successKey="child_created"
                successLabel="Kind hinzugefuegt"
                className="inline-flex w-full items-center justify-center rounded-xl bg-jdav-green px-4 py-2.5 text-sm font-black text-white shadow-md transition-all hover:bg-jdav-green-dark hover:shadow-lg"
              >
                Kind hinzufügen
              </AnimatedSubmitButton>
            </AsyncForm>
          </div>
        </div>
      )}
    </div>
  );
}
