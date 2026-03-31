"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteDocument } from "@/app/actions/admin-documents";

export function DeleteDocumentButton({
  id,
  fileUrl,
}: {
  id: string;
  fileUrl: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Dokument wirklich löschen?")) return;
    setIsDeleting(true);
    const result = await deleteDocument(id, fileUrl);
    if (result?.error) {
      alert(result.error);
    }
    setIsDeleting(false);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Löschen"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  );
}
