import { Activity, Clock, Database, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { getNotificationDeliveryMode } from "@/lib/notifications/outbox";
import { createClient } from "@/utils/supabase/server";

export default async function ObservabilityDashboard() {
  const supabase = await createClient();

  // Authorization check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const deliveryMode = getNotificationDeliveryMode();

  // 1. Fetch system metrics
  const { data: metrics, error: metricsError } = await supabase
    .from("system_metrics_outbox")
    .select("*")
    .maybeSingle();

  // 2. Fetch recent audit logs
  const { data: audits } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles(name, email)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Observability & Betriebsmetriken
        </h1>
        <p className="text-slate-600 mt-2">
          P3.1 Überwachung des Event-Systems und der Domain-Status-Transitions
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">Notification Delivery Mode:</span>{" "}
          <span className="uppercase tracking-wide">{deliveryMode}</span>
          {deliveryMode === "direct" && (
            <p className="mt-1 text-amber-700">
              Outbox-Metriken bleiben in "direct" meist leer. Setze
              NOTIFICATION_DELIVERY_MODE=outbox, damit das System die Outbox und
              diese Metriken aktiv nutzt.
            </p>
          )}
        </div>
        {metricsError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Fehler beim Laden der Outbox-Metriken: {metricsError.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">
                Outbox Events
              </p>
              <p className="text-2xl font-bold">{metrics?.total_events || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <p className="text-2xl font-bold">
                {metrics?.pending_events || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">
                Fehler (Failed)
              </p>
              <p className="text-2xl font-bold">
                {metrics?.failed_events || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-500">Ø Latenz (s)</p>
              <p className="text-2xl font-bold">
                {(metrics?.avg_processing_latency_seconds || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Letzte Status-Transitionen (Audit Logs)
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-medium">Zeitpunkt</th>
                <th className="p-4 font-medium">Typ</th>
                <th className="p-4 font-medium">Aktion</th>
                <th className="p-4 font-medium">Akteur</th>
                <th className="p-4 font-medium">Änderung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits?.map((audit) => (
                <tr key={audit.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600">
                    {new Date(audit.created_at).toLocaleString("de-DE")}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {audit.entity_type}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {audit.action}
                  </td>
                  <td className="p-4 text-slate-600">
                    {/* @ts-ignore */}
                    {audit.actor?.name || "System / Unbekannt"}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">
                    {/* @ts-ignore */}
                    {audit.old_payload?.status} &rarr;{" "}
                    {audit.new_payload?.status}
                  </td>
                </tr>
              ))}
              {(!audits || audits.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Keine Audit-Logs gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
