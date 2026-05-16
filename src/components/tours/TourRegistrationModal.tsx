/// <reference lib="dom" />
"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { TourRegistrationForm } from "./TourRegistrationForm";

interface Material {
  id: string; // material_type_id
  name: string;
  sizes: string[];
}

interface Child {
  id: string;
  full_name: string;
  birthdate: string;
}

interface TourRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourStartDate: string;
  minAge: number | null;
  childrenProfiles: Child[];
  availableMaterials: Material[];
}

export function TourRegistrationModal({
  isOpen,
  onClose,
  tourId,
  tourTitle,
  tourStartDate,
  minAge,
  childrenProfiles,
  availableMaterials,
}: TourRegistrationModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Modal schließen"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Touranmeldung</h2>
            <p className="text-sm text-slate-500 truncate max-w-62.5">
              {tourTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <TourRegistrationForm
            tourId={tourId}
            tourStartDate={tourStartDate}
            minAge={minAge}
            childrenProfiles={childrenProfiles}
            availableMaterials={availableMaterials}
            onCancel={onClose}
            onSuccess={onClose}
          />
        </div>
      </div>
    </div>
  );
}
