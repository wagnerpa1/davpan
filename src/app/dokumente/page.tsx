import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { File, Download } from "lucide-react";

export default async function DokumentePage() {
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("category", { ascending: true });
    
  // Group documents by category
  const groupedDocs = documents?.reduce((acc: any, doc: any) => {
    (acc[doc.category] = acc[doc.category] || []).push(doc);
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dokumente & Downloads
        </h1>
        <p className="mt-2 text-slate-600">Wichtige Formulare und Leitfäden der Sektion.</p>
      </div>

      <div className="space-y-10">
        {groupedDocs && Object.keys(groupedDocs).length > 0 ? (
          Object.keys(groupedDocs).map((category) => (
            <div key={category}>
              <h2 className="mb-4 text-xl font-semibold capitalize text-slate-800">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {groupedDocs[category].map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-jdav-green hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-jdav-green group-hover:bg-jdav-green group-hover:text-white transition-colors">
                        <File className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1">{doc.title}</p>
                      </div>
                    </div>
                    <Download className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-jdav-green" />
                  </a>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-12 text-center text-slate-500">
            <File className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p>Es wurden noch keine Dokumente hochgeladen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
