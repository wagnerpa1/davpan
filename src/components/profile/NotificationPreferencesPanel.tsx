"use client";

import { useMemo, useState } from "react";
import { PushSubscriptionControl } from "@/components/profile/PushSubscriptionControl";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";
import { AsyncForm } from "@/components/ui/AsyncForm";

export interface NotificationPreference {
  news_enabled: boolean;
  system_enabled: boolean;
  material_enabled: boolean;
  comments_enabled: boolean;
  group_notifications_enabled: boolean;
  push_enabled: boolean;
  tour_group_ids: string[];
}

export interface TourGroupItem {
  id: string;
  group_name: string | null;
}

export interface ChildNotificationPreference {
  id: string;
  full_name: string;
  preferences: NotificationPreference;
}

interface NotificationPreferencesPanelProps {
  ownPreferences: NotificationPreference;
  tourGroups: TourGroupItem[];
  childPreferences: ChildNotificationPreference[];
}

type TabKey = "self" | `child-${string}`;

function PreferenceFields({
  preferences,
  tourGroups,
}: {
  preferences: NotificationPreference;
  tourGroups: TourGroupItem[];
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="news_enabled"
            defaultChecked={preferences.news_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Vereinsnews
        </label>
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="system_enabled"
            defaultChecked={preferences.system_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Systemmeldungen
        </label>
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="material_enabled"
            defaultChecked={preferences.material_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Materialmeldungen
        </label>
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="comments_enabled"
            defaultChecked={preferences.comments_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Kommentare auf eigene Inhalte
        </label>
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="group_notifications_enabled"
            defaultChecked={preferences.group_notifications_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Tour-Gruppen-Benachrichtigungen aktiv
        </label>
        <label className="flex items-center gap-2 rounded-card border border-slate-200 p-4 text-sm">
          <input
            type="checkbox"
            name="push_enabled"
            defaultChecked={preferences.push_enabled}
            className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
          />
          Push-Benachrichtigungen (Browser)
        </label>
      </div>

      <div className="rounded-card border border-slate-200 p-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          Tour-Gruppen
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tourGroups.map((group) => (
            <label
              key={group.id}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="tour_group_ids"
                value={group.id}
                defaultChecked={preferences.tour_group_ids.includes(group.id)}
                className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
              />
              {group.group_name || "Unbenannte Gruppe"}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export function NotificationPreferencesPanel({
  ownPreferences,
  tourGroups,
  childPreferences,
}: NotificationPreferencesPanelProps) {
  const hasChildTabs = childPreferences.length > 0;
  const [activeTab, setActiveTab] = useState<TabKey>("self");

  const activeChild = useMemo(() => {
    if (!activeTab.startsWith("child-")) {
      return null;
    }

    const childId = activeTab.replace("child-", "");
    return childPreferences.find((child) => child.id === childId) ?? null;
  }, [activeTab, childPreferences]);

  return (
    <div className="mt-8 space-y-6 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Benachrichtigungen</h2>
        <p className="text-sm text-slate-500">
          Lege fest, welche News und Tour-Gruppen im Notification-Center
          angezeigt werden.
        </p>
      </div>

      <PushSubscriptionControl />

      {hasChildTabs && (
        <div className="flex flex-wrap gap-2 rounded-card border border-slate-200 bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => setActiveTab("self")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "self"
                ? "bg-jdav-green text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Ich
          </button>
          {childPreferences.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setActiveTab(`child-${child.id}`)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === `child-${child.id}`
                  ? "bg-jdav-green text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {child.full_name}
            </button>
          ))}
        </div>
      )}

      {(activeTab === "self" || !hasChildTabs) && (
        <AsyncForm
          action="/api/profile/notifications"
          method="POST"
          successKey="notifications_self"
          className="flex flex-col gap-3"
        >
          <PreferenceFields
            preferences={ownPreferences}
            tourGroups={tourGroups}
          />
          <AnimatedSubmitButton
            successKey="notifications_self"
            successLabel="Gespeichert"
            className="inline-flex items-center justify-center rounded-button bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
          >
            Benachrichtigungen speichern
          </AnimatedSubmitButton>
        </AsyncForm>
      )}

      {hasChildTabs && activeTab !== "self" && activeChild && (
        <AsyncForm
          action="/api/profile/child/notifications"
          method="POST"
          successKey="notifications_child"
          successChildId={activeChild.id}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="child_id" value={activeChild.id} />
          <PreferenceFields
            preferences={activeChild.preferences}
            tourGroups={tourGroups}
          />
          <AnimatedSubmitButton
            successKey="notifications_child"
            successChildId={activeChild.id}
            successLabel="Gespeichert"
            className="inline-flex items-center justify-center rounded-button bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
          >
            Einstellungen für {activeChild.full_name} speichern
          </AnimatedSubmitButton>
        </AsyncForm>
      )}
    </div>
  );
}
