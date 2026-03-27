import { File } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { DeleteDocumentButton } from "./DeleteDocumentButton";
import { DocumentUploadForm } from "./DocumentUploadForm";

interface AdminDocument {
  id: string;
  title: string;
  category: string | null;
  file_url: string;
}

export const metadata = {
  title: "Admin - Dokumente verwalten | JDAV Pfarrkirchen",
};

export default async function AdminDokumentePage() {
  const supabase = await createClient();
  const authContext = await getCurrentUserProfile();

  if (authContext.role !== "admin") {
    redirect("/dokumente");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("category", { ascending: true });

  const categories = [
    "Allgemein",
    "Formulare",
    "Packlisten",
    "Vereinsregeln",
    "JDAV",
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Dokumente verwalten
          </h1>
          <p className="text-slate-600 mt-1">
            Hier können Sie Sektionsdokumente hochladen oder löschen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Upload Form (Client Component) */}
        <div className="md:col-span-1">
          <DocumentUploadForm categories={categories} />
        </div>

        {/* Documents List */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Titel</th>
                  <th className="px-6 py-4">Kategorie</th>
                  <th className="px-6 py-4 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(documents as AdminDocument[] | null)?.length ? (
                  (documents as AdminDocument[]).map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <File className="h-4 w-4 text-jdav-green" />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-slate-900 hover:underline"
                          >
                            {doc.title}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DeleteDocumentButton
                          id={doc.id}
                          fileUrl={doc.file_url}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-slate-500 italic"
                    >
                      Noch keine Dokumente hochgeladen.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
