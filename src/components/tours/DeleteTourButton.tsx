/// <reference lib="dom" />
"use client";

import { AlertCircle, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteTour } from "@/app/actions/tour-management";
import { Button } from "@/components/ui/button";

interface DeleteTourButtonProps {
  tourId: string;
}

export function DeleteTourButton({ tourId }: DeleteTourButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowConfirm(false);
    };
    if (showConfirm) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showConfirm]);

  const handleDelete = async () => {
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    setShowConfirm(false);
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
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isDeleting ? "Sagt ab..." : "Absagen"}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            type="button"
            aria-label="Bestätigungsdialog schließen"
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mb-1 text-xl font-black text-slate-900">
              Tour absagen?
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              Möchtest du diese Tour wirklich absagen? Die Tour bleibt erhalten,
              ist aber nicht mehr buchbar.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowConfirm(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={confirmDelete}
              >
                Ja, absagen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
