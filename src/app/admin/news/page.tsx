import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteNewsButton } from "@/components/admin/DeleteNewsButton";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

interface TourGroup {
  id: string;
  group_name: string;
}

interface SystemAuditEntry {
  id: string;
  sent_by: string;
  title: string;
  message: string;
  target_mode: "all" | "roles" | "tour_groups";
  target_roles: string[];
  target_group_ids: string[];
  user_target_count: number;
  child_target_count: number;
  created_at: string;
}

interface ArchiveYearGroup<T> {
  year: string;
  items: T[];
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("de-DE");
}

function formatYear(value: string) {
  return new Date(value).getFullYear().toString();
}

function groupByArchiveYear<T>(
  items: T[],
  getDate: (item: T) => string,
): ArchiveYearGroup<T>[] {
  const yearMap = new Map<string, T[]>();

  for (const item of items) {
    const year = formatYear(getDate(item));
    const bucket = yearMap.get(year) ?? [];
    bucket.push(item);
    yearMap.set(year, bucket);
  }

  return Array.from(yearMap.entries())
    .map(([year, groupedItems]) => ({
      year,
      items: groupedItems,
    }))
    .sort((left, right) => Number(right.year) - Number(left.year));
}

export const metadata: Metadata = {
  title: "Admin - Vereinsnews | JDAV Pfarrkirchen",
};

export default async function AdminNewsPage() {
  const [authContext, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!isAdminRole(authContext.role)) {
    redirect("/");
  }

  const [{ data: newsPosts }, { data: tourGroups }, { data: systemAuditRows }] =
    await Promise.all([
      supabase
        .from("news_posts")
        .select("id, title, content, image_url, published_at")
        .order("published_at", { ascending: false }),
      supabase.from("tour_groups").select("id, group_name").order("group_name"),
      supabase
        .from("admin_system_notification_audit")
        .select(
          "id, sent_by, title, message, target_mode, target_roles, target_group_ids, user_target_count, child_target_count, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

  const audits = (systemAuditRows ?? []) as SystemAuditEntry[];
  const newsByYear = groupByArchiveYear(
    (newsPosts ?? []) as NewsPost[],
    (news) => news.published_at,
  );
  const auditsByYear = groupByArchiveYear(audits, (audit) => audit.created_at);

  const senderIds = Array.from(
    new Set(audits.map((entry) => entry.sent_by).filter(Boolean)),
  );
  const { data: senderProfiles } = senderIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", senderIds)
    : { data: [] as { id: string; full_name: string }[] };

  const senderMap = new Map(
    ((senderProfiles ?? []) as { id: string; full_name: string }[]).map(
      (row) => [row.id, row.full_name],
    ),
  );

  const groupMap = new Map(
    ((tourGroups ?? []) as TourGroup[]).map((group) => [
      group.id,
      group.group_name,
    ]),
  );

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Vereinsnews verwalten
        </h1>
        <p className="mt-2 text-slate-500">
          Neue News und Systemmeldungen veröffentlichen sowie bestehende Einträge einsehen und löschen.
        </p>
      </div>

      <div className="space-y-6">
        <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Neue News</h2>
            <p className="text-sm text-slate-500">
              Veröffentlichung löst die passenden Benachrichtigungen aus.
            </p>
          </div>
          <form action="/api/admin/news" method="POST" className="space-y-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="news-title"
                className="block text-sm font-medium text-slate-700"
              >
                Titel
              </label>
              <input
                id="news-title"
                name="title"
                required
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="news-content"
                className="block text-sm font-medium text-slate-700"
              >
                Inhalt
              </label>
              <textarea
                id="news-content"
                name="content"
                required
                rows={6}
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="news-image-url"
                className="block text-sm font-medium text-slate-700"
              >
                Bild-URL (optional)
              </label>
              <input
                id="news-image-url"
                name="image_url"
                type="url"
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
            >
              News veröffentlichen
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">Systemnachricht senden</h2>
            <p className="text-sm text-slate-500">
              Zielgruppe und Rollen lassen sich direkt hier festlegen.
            </p>
          </div>
          <form
            action="/api/admin/system-notifications"
            method="POST"
            className="space-y-4"
          >
            <div className="flex flex-col gap-1">
              <label
                htmlFor="system-title"
                className="block text-sm font-medium text-slate-700"
              >
                Titel
              </label>
              <input
                id="system-title"
                name="title"
                required
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="system-target-mode"
                className="block text-sm font-medium text-slate-700"
              >
                Zielgruppe
              </label>
              <select
                id="system-target-mode"
                name="target_mode"
                defaultValue="all"
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              >
                <option value="all">Alle (Mitglieder + Kinder)</option>
                <option value="roles">Nur Rollen</option>
                <option value="tour_groups">Nur Tour-Gruppen</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                Rollen (für Modus "Nur Rollen")
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-3">
                {[
                  ["member", "Mitglied"],
                  ["parent", "Eltern"],
                  ["guide", "Guide"],
                  ["materialwart", "Materialwart"],
                  ["admin", "Admin"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm"
                  >
                    <input type="checkbox" name="roles" value={value} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                Tour-Gruppen (für Modus "Nur Tour-Gruppen")
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-3">
                {((tourGroups ?? []) as TourGroup[]).length > 0 ? (
                  ((tourGroups ?? []) as TourGroup[]).map((group) => (
                    <label
                      key={group.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        name="group_ids"
                        value={group.id}
                      />
                      <span>{group.group_name}</span>
                    </label>
                  ))
                ) : (
                  <p className="col-span-2 text-xs text-slate-500">
                    Keine Tour-Gruppen vorhanden.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="system-message"
                className="block text-sm font-medium text-slate-700"
              >
                Nachricht
              </label>
              <textarea
                id="system-message"
                name="message"
                required
                rows={5}
                className="block w-full rounded-input border border-slate-300 px-3 py-1.5 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-slate-800 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
            >
              Systemnachricht senden
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Vereinsnews-Archiv</h2>
              <p className="text-sm text-slate-500">
                Nach Jahren sortiert und standardmäßig eingeklappt.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {newsPosts?.length ?? 0} Einträge
            </span>
          </div>

          {newsByYear.length > 0 ? (
            <div className="space-y-3">
              {newsByYear.map((yearGroup) => (
                <details
                  key={yearGroup.year}
                  className="rounded-xl border border-slate-200 bg-slate-50/70"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Jahr {yearGroup.year}
                      </p>
                      <p className="text-xs text-slate-500">
                        {yearGroup.items.length} Nachrichten
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-jdav-green">
                      Aufklappen
                    </span>
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <div className="space-y-3">
                      {yearGroup.items.map((news) => (
                        <article
                          key={news.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-jdav-green">
                                <Newspaper className="h-3 w-3" /> Vereinsnews
                              </p>
                              <h3 className="text-base font-bold text-slate-900">
                                {news.title}
                              </h3>
                            </div>
                            <DeleteNewsButton id={news.id} />
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700">
                            {news.content}
                          </p>
                          {news.image_url ? (
                            <a
                              href={news.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-block text-xs font-semibold text-jdav-green hover:underline"
                            >
                              Bild öffnen
                            </a>
                          ) : null}
                          <p className="mt-3 text-xs text-slate-500">
                            {formatTimestamp(news.published_at)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Noch keine Vereinsnews vorhanden.
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                Systemnachrichten-Archiv
              </h2>
              <p className="text-sm text-slate-500">
                Versandprotokoll ebenfalls nach Jahren gruppiert und zunächst
                zu.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {audits.length} Einträge
            </span>
          </div>

          {auditsByYear.length > 0 ? (
            <div className="space-y-3">
              {auditsByYear.map((yearGroup) => (
                <details
                  key={yearGroup.year}
                  className="rounded-xl border border-slate-200 bg-slate-50/70"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Jahr {yearGroup.year}
                      </p>
                      <p className="text-xs text-slate-500">
                        {yearGroup.items.length} Systemnachrichten
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-jdav-green">
                      Aufklappen
                    </span>
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <div className="space-y-3">
                      {yearGroup.items.map((entry) => (
                        <article
                          key={entry.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                {entry.title}
                              </h3>
                              <p className="mt-1 text-xs text-slate-600">
                                {entry.message}
                              </p>
                            </div>
                            <p className="shrink-0 text-[11px] text-slate-500">
                              {new Date(entry.created_at).toLocaleString(
                                "de-DE",
                              )}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              Modus: {entry.target_mode}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              User: {entry.user_target_count}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              Kinder: {entry.child_target_count}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              von: {senderMap.get(entry.sent_by) ?? "Unbekannt"}
                            </span>
                          </div>
                          {entry.target_roles?.length > 0 && (
                            <p className="mt-2 text-xs text-slate-600">
                              Rollen: {entry.target_roles.join(", ")}
                            </p>
                          )}
                          {entry.target_group_ids?.length > 0 && (
                            <p className="mt-1 text-xs text-slate-600">
                              Gruppen:{" "}
                              {entry.target_group_ids
                                .map((id) => groupMap.get(id) ?? id)
                                .join(", ")}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Noch keine Systemnachrichten versendet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
