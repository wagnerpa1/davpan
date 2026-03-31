"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteNewsButtonProps {
  id: string;
}

export function DeleteNewsButton({ id }: DeleteNewsButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm("Diese News wirklich löschen?");
    if (!confirmed) return;

    setIsDeleting(true);

    const response = await fetch(`/api/admin/news?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    setIsDeleting(false);

    if (!response.ok) {
      window.alert("Löschen fehlgeschlagen.");
      return;
    }

    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isDeleting ? "Lösche..." : "Löschen"}
    </button>
  );
}
