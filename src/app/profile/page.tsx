import { redirect } from "next/navigation";
import {
  CreateChildInviteAction,
  RedeemChildInvitePopup,
} from "@/components/profile/ChildInviteCards";
import { DeleteAccountButton } from "@/components/profile/DeleteAccountButton";
import {
  type NotificationPreference,
  NotificationPreferencesPanel,
  type TourGroupItem,
} from "@/components/profile/NotificationPreferencesPanel";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";
import { AsyncForm } from "@/components/ui/AsyncForm";
import { TextareaWithCounter } from "@/components/ui/TextareaWithCounter";
import { getRoleDisplayName, isParentRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

interface ChildProfile {
  id: string;
  full_name: string;
  birthdate: string;
  medical_notes: string | null;
  image_consent: boolean | null;
}

interface ChildNotificationPreferenceItem {
  id: string;
  full_name: string;
  preferences: NotificationPreference;
}

function formatMembershipNumber(value: string | null | undefined) {
  if (!value) {
    return "Nicht angegeben";
  }

  return `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}`;
}

function mapChildProfileRow(
  row: ChildProfile & { parent_child_relations?: unknown },
) {
  const { parent_child_relations: _relations, ...rest } = row;
  return rest as ChildProfile;
}

async function loadChildrenForParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
) {
  const { data } = await supabase
    .from("child_profiles")
    .select("id, full_name, birthdate, medical_notes, image_consent")
    .eq("parent_id", parentId)
    .order("full_name");

  return ((data || []) as ChildProfile[]).map(mapChildProfileRow);
}

function buildChildNotificationPreferences(
  children: ChildProfile[],
  childPreferenceById: Map<string, NotificationPreference>,
): ChildNotificationPreferenceItem[] {
  return children.map((child) => ({
    id: child.id,
    full_name: child.full_name,
    preferences:
      childPreferenceById.get(child.id) ?? DEFAULT_NOTIFICATION_PREFERENCES,
  }));
}

function PersonalDataSection({
  user,
  profile,
}: {
  user: NonNullable<
    Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]
  > extends never
    ? never
    : { email?: string | null };
  profile: {
    full_name?: string | null;
    membership_number?: string | null;
    role?: string | null;
    is_activated?: boolean | null;
    birthdate?: string | null;
    phone?: string | null;
    emergency_phone?: string | null;
    medical_notes?: string | null;
    image_consent?: boolean | null;
  } | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
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
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
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
            defaultValue={user.email ?? ""}
            className="block w-full rounded-input border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
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
            maxLength={100}
            defaultValue={profile?.full_name || ""}
            className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            placeholder="Dein Vor- und Nachname"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="profile-membership-number"
            className="block text-sm font-medium text-slate-700"
          >
            Mitgliedsnummer
          </label>
          <input
            id="profile-membership-number"
            type="text"
            disabled
            defaultValue={formatMembershipNumber(profile?.membership_number)}
            className="block w-full rounded-input border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-sm text-slate-500"
          />
          <p className="pt-0.5 text-xs text-slate-500">
            Deine Mitgliedsnummer kann nicht geändert werden
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="profile-role"
            className="block text-sm font-medium text-slate-700"
          >
            Konto-Typ / Rolle
          </label>
          <input
            id="profile-role"
            disabled
            defaultValue={getRoleDisplayName(profile?.role)}
            className="block w-full rounded-input border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm capitalize text-slate-500"
          />
          <p className="pt-0.5 text-xs text-slate-500">
            Deine Rolle wird zentral verwaltet und nicht im Self-Service
            geändert.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="profile-activation-status"
            className="block text-sm font-medium text-slate-700"
          >
            Aktivierungsstatus
          </label>
          <input
            id="profile-activation-status"
            disabled
            defaultValue={profile?.is_activated ? "Aktiviert" : "Offen"}
            className="block w-full rounded-input border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500"
          />
          <p className="pt-0.5 text-xs text-slate-500">
            Erst nach dem Datenreview wird das Konto vollständig freigeschaltet.
          </p>
        </div>

        {profile?.role !== "parent" && (
          <div className="flex flex-col gap-1">
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
              className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
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
              maxLength={50}
              defaultValue={profile?.phone || ""}
              placeholder="Deine Handynummer"
              className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>

          <div className="flex flex-col gap-1">
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
              maxLength={50}
              defaultValue={profile?.emergency_phone || ""}
              placeholder="Wird nur Guides angezeigt"
              className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="profile-medical-notes"
            className="block text-sm font-medium text-slate-700"
          >
            Medizinische Hinweise
          </label>
          <TextareaWithCounter
            id="profile-medical-notes"
            name="medical_notes"
            maxLength={2000}
            defaultValue={profile?.medical_notes || ""}
            placeholder="Allergien, Medikamente etc. (nur für Guides sichtbar)"
            rows={3}
            className="block w-full"
          />
        </div>

        <div className="rounded-card border border-slate-100 bg-slate-50 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="image_consent"
              defaultChecked={profile?.image_consent ?? false}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
            />
            <div className="space-y-1.5 text-sm">
              <span className="font-bold text-slate-900">
                Einwilligung zur Verwendung von Bildern
              </span>
              <p className="text-xs leading-relaxed text-slate-500">
                Ich erkläre mich damit einverstanden, dass Fotos von mir, die im
                Rahmen von Vereinsaktivitäten entstehen, auf der Webseite, in
                Druckerzeugnissen oder Social-Media-Kanälen der Sektion
                veröffentlicht werden dürfen.
              </p>
            </div>
          </label>
        </div>

        <AnimatedSubmitButton
          successKey="profile"
          successLabel="Gespeichert"
          className="inline-flex w-full items-center justify-center rounded-button bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
        >
          Profil speichern
        </AnimatedSubmitButton>
      </AsyncForm>
    </div>
  );
}

function ChildProfileCard({ child }: { child: ChildProfile }) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between bg-slate-50 p-3 transition-colors hover:bg-slate-100">
          <div>
            <span className="block font-bold text-slate-900">
              {child.full_name}
            </span>
            <span className="text-xs text-slate-500">
              Geburtsdatum: {child.birthdate}
            </span>
          </div>
          <span className="text-xs font-semibold text-jdav-green group-open:text-slate-400">
            Details / Bearbeiten
          </span>
        </summary>
        <div className="border-t border-slate-100 bg-white p-3">
          <AsyncForm
            action="/api/profile/child"
            method="POST"
            successKey="child_updated"
            successChildId={child.id}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="child_id" value={child.id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${child.id}-child-name`}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-700"
                >
                  Name
                </label>
                <input
                  id={`${child.id}-child-name`}
                  type="text"
                  name="child_name"
                  maxLength={100}
                  defaultValue={child.full_name}
                  required
                  className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`${child.id}-child-birthdate`}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-700"
                >
                  Geburtsdatum
                </label>
                <input
                  id={`${child.id}-child-birthdate`}
                  type="date"
                  name="child_birthdate"
                  defaultValue={child.birthdate}
                  required
                  className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`${child.id}-medical-notes`}
                className="block text-xs font-medium uppercase tracking-wider text-slate-700"
              >
                Medizinische Hinweise
              </label>
              <TextareaWithCounter
                id={`${child.id}-medical-notes`}
                name="medical_notes"
                maxLength={2000}
                defaultValue={child.medical_notes || ""}
                placeholder="Allergien, Medikamente etc."
                rows={2}
                className="block w-full"
              />
            </div>
            <div className="rounded-card bg-slate-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="image_consent"
                  defaultChecked={child.image_consent ?? false}
                  className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                />
                <div className="space-y-1 text-[11px] leading-tight text-slate-600">
                  <span className="font-bold text-slate-900">
                    Einwilligung zur Bildverwendung
                  </span>
                  <p>
                    Ich erlaube die Verwendung von Fotos dieses Kindes für
                    Vereinszwecke.
                  </p>
                </div>
              </label>
            </div>
            <div className="flex justify-end">
              <AnimatedSubmitButton
                successKey="child_updated"
                successChildId={child.id}
                successLabel="Gespeichert"
                className="rounded-button bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-700"
              >
                Änderungen speichern
              </AnimatedSubmitButton>
            </div>
          </AsyncForm>
          <CreateChildInviteAction childId={child.id} />
        </div>
      </details>
    </div>
  );
}

function ParentChildrenSection({
  childProfiles,
}: {
  childProfiles: ChildProfile[];
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Meine Kinder</h2>
        <p className="text-sm text-slate-500">
          Verwalte die Profile deiner Kinder, um sie für Touren anzumelden.
        </p>
      </div>

      {childProfiles.length > 0 ? (
        <div className="flex flex-col gap-3">
          {childProfiles.map((child) => (
            <ChildProfileCard key={child.id} child={child} />
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
          Du hast noch keine Kinderprofile angelegt.
        </div>
      )}

      <div className="mt-6 space-y-2">
        <h3 className="text-lg font-bold text-slate-900">
          Kind per Einladungscode hinzufügen
        </h3>
        <p className="text-sm text-slate-500">
          Wenn ein anderer Elternteil das Kind bereits angelegt hat, kannst du
          es hier per Code verknüpfen.
        </p>
        <RedeemChildInvitePopup />
      </div>

      <div className="mt-6 border-t border-slate-100 pt-8">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          Neues Kind hinzufügen
        </h3>
        <AsyncForm
          action="/api/profile/child"
          method="POST"
          successKey="child_created"
          className="flex flex-col gap-3 rounded-card border border-slate-100 bg-slate-50 p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="new-child-name"
                className="block text-xs font-medium uppercase tracking-wider text-slate-700"
              >
                Name
              </label>
              <input
                id="new-child-name"
                type="text"
                name="child_name"
                maxLength={100}
                placeholder="Vor- und Nachname"
                required
                className="block w-full rounded-input border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="new-child-birthdate"
                className="block text-xs font-medium uppercase tracking-wider text-slate-700"
              >
                Geburtsdatum
              </label>
              <input
                id="new-child-birthdate"
                type="date"
                name="child_birthdate"
                required
                className="block w-full rounded-input border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-child-medical-notes"
              className="block text-xs font-medium uppercase tracking-wider text-slate-700"
            >
              Medizinische Hinweise
            </label>
            <TextareaWithCounter
              id="new-child-medical-notes"
              name="medical_notes"
              maxLength={2000}
              placeholder="Z.B. Asthma, Nussallergie..."
              rows={2}
              className="block w-full"
            />
          </div>
          <div className="rounded-card border border-slate-200 bg-white p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="image_consent"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
              />
              <div className="space-y-1.5 text-xs leading-relaxed text-slate-600">
                <span className="font-bold uppercase tracking-wider text-slate-900">
                  Bild-Einwilligung erteilen
                </span>
                <p>
                  Hiermit willige ich in die Veröffentlichung von Bildmaterial
                  meines Kindes für Vereinszwecke ein.
                </p>
              </div>
            </label>
          </div>
          <AnimatedSubmitButton
            successKey="child_created"
            successLabel="Kind hinzugefügt"
            className="inline-flex w-full items-center justify-center rounded-card bg-jdav-green px-4 py-2.5 text-sm font-black text-white shadow-md transition-colors hover:bg-jdav-green-dark hover:shadow-lg"
          >
            Kind hinzufügen
          </AnimatedSubmitButton>
        </AsyncForm>
      </div>
    </div>
  );
}

function AccountDeletionSection() {
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-card border border-red-200 bg-red-50 p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-red-700">Account löschen</h2>
        <p className="mt-1 text-sm text-red-600">
          Hier kannst du dein Benutzerkonto endgültig löschen. Dein Profil wird
          in der Historie und auf vergangenen Touren als "Gelöschter Nutzer"
          anonymisiert. Wir entfernen alle erfassten Notfalldaten und
          Kontaktdetails unwiderruflich.
        </p>
      </div>
      <DeleteAccountButton />
    </div>
  );
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference = {
  news_enabled: true,
  system_enabled: true,
  material_enabled: true,
  comments_enabled: true,
  group_notifications_enabled: true,
  push_enabled: false,
  tour_group_ids: [],
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const children = isParentRole(profile?.role)
    ? await loadChildrenForParent(supabase, user.id)
    : [];

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
    ...DEFAULT_NOTIFICATION_PREFERENCES,
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

  const childNotificationPreferences = buildChildNotificationPreferences(
    children,
    childPreferenceById,
  );

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Profil & Einstellungen
        </h1>
      </div>

      <PersonalDataSection user={user} profile={profile} />

      <NotificationPreferencesPanel
        ownPreferences={ownPreferences}
        tourGroups={(tourGroups as TourGroupItem[] | null) ?? []}
        childPreferences={childNotificationPreferences}
      />

      {profile?.role === "parent" && (
        <ParentChildrenSection childProfiles={children} />
      )}

      <AccountDeletionSection />
    </div>
  );
}
