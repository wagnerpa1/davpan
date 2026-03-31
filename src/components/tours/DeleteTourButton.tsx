/// <reference lib="dom" />
"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteTour } from "@/app/actions/tour-management";

interface DeleteTourButtonProps {
  tourId: string;
}

export function DeleteTourButton({ tourId }: DeleteTourButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Möchtest du diese Tour wirklich absagen? Die Tour bleibt erhalten, ist aber nicht mehr buchbar.",
      )
    ) {
      setIsDeleting(true);
      try {
        await deleteTour(tourId);
      } catch (error) {
        console.error("Failed to delete tour:", error);
        if (typeof window !== "undefined") {
          window.alert("Absagen fehlgeschlagen. Bitte versuche es erneut.");
        }
        setIsDeleting(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {isDeleting ? "Sagt ab..." : "Absagen"}
    </button>
  );
}
