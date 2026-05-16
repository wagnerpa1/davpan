"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { uploadDocument } from "@/app/actions/admin-documents";

export function DocumentUploadForm({ categories }: { categories: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setIsPending(true);

    const result = await uploadDocument(formData);
    setIsPending(false);

    if (result?.error) {
      setError(result.error);
    } else {
      // Success - page will be revalidated by server action
      // Clear form
      const form = document.getElementById("upload-form") as HTMLFormElement;
      form?.reset();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sticky top-24">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Plus className="h-5 w-5 text-jdav-green" /> Neues Dokument
      </h3>
      <form id="upload-form" action={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="document-title"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Titel
          </label>
          <input
            id="document-title"
            name="title"
            type="text"
            required
            placeholder="z.B. Beitrittserklärung"
            className="w-full rounded-xl border-slate-200 focus:ring-jdav-green focus:border-jdav-green h-10 px-3 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="document-category"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Kategorie
          </label>
          <select
            id="document-category"
            name="category"
            required
            className="w-full rounded-xl border-slate-200 focus:ring-jdav-green focus:border-jdav-green h-10 px-3 text-sm"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="document-file"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Datei (PDF empfohlen)
          </label>
          <input
            id="document-file"
            name="file"
            type="file"
            required
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-jdav-green-light/20 file:text-jdav-green hover:file:bg-jdav-green-light/30 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-jdav-green hover:bg-jdav-green-dark text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          {isPending ? "Lädt hoch..." : "Hochladen"}
        </button>
      </form>
    </div>
  );
}
