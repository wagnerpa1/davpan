import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Calendar } from "lucide-react";
import Link from "next/link";

export default async function BerichtePage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("tour_reports")
    .select("*, tours(title, category)")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Tourberichte
        </h1>
      </div>

      <div className="grid gap-6">
        {reports && reports.length > 0 ? (
          reports.map((report) => (
            <Link key={report.id} href={`/berichte/${report.id}`} className="block">
              <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-jdav-green hover:shadow-md">
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-jdav-green">
                      <FileText className="h-4 w-4" /> Bericht
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(report.created_at), "dd.MM.yyyy", { locale: de })}
                    </span>
                  </div>
                  
                  <h2 className="mb-2 text-xl font-bold text-slate-900 group-hover:text-jdav-green">
                    {report.title}
                  </h2>
                  {report.tours && (
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      Tour: {report.tours.title}
                    </span>
                  )}
                  
                  <p className="mt-4 line-clamp-3 text-slate-600">
                    {report.text}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-12 text-center text-slate-500">
            <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p>Bisher wurden keine Berichte veröffentlicht.</p>
          </div>
        )}
      </div>
    </div>
  );
}
