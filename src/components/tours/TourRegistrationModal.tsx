/// <reference lib="dom" />
"use client";

import React, { useState, useEffect } from "react";
import { TourRegistrationForm } from "./TourRegistrationForm";
import { X } from "lucide-react";

interface Material {
  id: string;
  name: string;
}

interface Child {
  id: string;
  full_name: string;
}

interface TourRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  childrenProfiles: Child[];
  availableMaterials: Material[];
}

export function TourRegistrationModal({
  isOpen,
  onClose,
  tourId,
  tourTitle,
  childrenProfiles,
  availableMaterials
}: TourRegistrationModalProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: any) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      if (typeof window !== "undefined") {
        (window as any).addEventListener("keydown", handleEscape);
        (document as any).body.style.overflow = "hidden";
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        (window as any).removeEventListener("keydown", handleEscape);
        (document as any).body.style.overflow = "unset";
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Touranmeldung</h2>
            <p className="text-sm text-slate-500 truncate max-w-[250px]">{tourTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <TourRegistrationForm 
            tourId={tourId}
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
