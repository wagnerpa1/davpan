"use client";

import React, { useState } from "react";
import { registerForTour } from "@/app/actions/tour-registration";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

interface Material {
  id: string;
  name: string;
}

interface Child {
  id: string;
  full_name: string;
}

interface TourRegistrationFormProps {
  tourId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  childrenProfiles: Child[];
  availableMaterials: Material[];
}

export function TourRegistrationForm({
  tourId,
  onSuccess,
  onCancel,
  childrenProfiles,
  availableMaterials
}: TourRegistrationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>("self");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append("tourId", tourId);
    formData.append("childId", selectedChild);
    selectedMaterials.forEach(m => formData.append("materials", m));

    const result = await registerForTour(formData);

    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.message || "Erfolgreich angemeldet.");
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    }
  }

  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="mb-4 rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Geschafft!</h3>
        <p className="mt-2 text-slate-600">{success}</p>
        <p className="mt-4 text-xs text-slate-400">Das Fenster schließt sich automatisch...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-100">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Profile Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-900">Wer soll angemeldet werden?</label>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => setSelectedChild("self")}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
              selectedChild === "self" 
                ? "border-jdav-green bg-green-50 ring-1 ring-jdav-green" 
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <span className="font-medium text-slate-900">Ich selbst</span>
            {selectedChild === "self" && <div className="h-2 w-2 rounded-full bg-jdav-green" />}
          </button>

          {childrenProfiles.map(child => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChild(child.id)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                selectedChild === child.id 
                  ? "border-jdav-green bg-green-50 ring-1 ring-jdav-green" 
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <span className="font-medium text-slate-900">{child.full_name}</span>
              {selectedChild === child.id && <div className="h-2 w-2 rounded-full bg-jdav-green" />}
            </button>
          ))}
        </div>
      </div>

      {/* Material Selection */}
      {availableMaterials.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-900">Benötigtes Leihmaterial</label>
          <div className="grid grid-cols-1 gap-2">
            {availableMaterials.map(material => (
              <label 
                key={material.id}
                className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                  selectedMaterials.includes(material.id)
                    ? "border-jdav-green bg-green-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input 
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                  checked={selectedMaterials.includes(material.id)}
                  onChange={() => toggleMaterial(material.id)}
                />
                <span className="font-medium text-slate-700">{material.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 italic">Material wird erst bei tatsächlicher Ausgabe reserviert.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 sm:flex-row-reverse">
        <Button 
          type="submit" 
          disabled={isPending}
          size="lg"
          className="w-full bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-12 rounded-xl shadow-lg shadow-green-900/10"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Wird verarbeitet...
            </>
          ) : (
            "Anmeldung abschicken"
          )}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onCancel}
          className="w-full text-slate-500 hover:text-slate-900"
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
