"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useRef, useState } from "react";
import { registerForTour } from "@/app/actions/tour-registration";
import { Button } from "@/components/ui/button";
import { isOfflineQueued, runClientAction } from "@/lib/client-action-runner";

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

interface TourRegistrationFormProps {
  tourId: string;
  tourStartDate: string;
  minAge: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  childrenProfiles: Child[];
  availableMaterials: Material[];
}

function calculateIsAgeTooYoung(
  selectedChild: string,
  childrenProfiles: Child[],
  minAge: number | null,
  tourStartDate: string,
): boolean {
  if (!minAge || !tourStartDate || selectedChild === "self") {
    return false;
  }

  const child = childrenProfiles.find((c) => c.id === selectedChild);
  if (!child?.birthdate) {
    return false;
  }

  const bDate = new Date(child.birthdate);
  const sDate = new Date(tourStartDate);
  let age = sDate.getFullYear() - bDate.getFullYear();
  const m = sDate.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && sDate.getDate() < bDate.getDate())) {
    age--;
  }

  return age < minAge;
}

interface TourRegistrationSuccessViewProps {
  message: string;
}

function TourRegistrationSuccessView({
  message,
}: TourRegistrationSuccessViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
      <div className="mb-4 rounded-full bg-jdav-green/10 p-3">
        <CheckCircle2 className="h-10 w-10 text-jdav-green" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">Geschafft!</h3>
      <p className="mt-2 text-slate-600">{message}</p>
      <p className="mt-4 text-xs text-slate-400">
        Das Fenster schließt sich automatisch...
      </p>
    </div>
  );
}

interface TourRegistrationProfileSelectorProps {
  selectedChild: string;
  onSelectChild: (id: string) => void;
  childrenProfiles: Child[];
}

function TourRegistrationProfileSelector({
  selectedChild,
  onSelectChild,
  childrenProfiles,
}: TourRegistrationProfileSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">
        Wer soll angemeldet werden?
      </p>
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          aria-label="Ich selbst auswählen"
          onClick={() => onSelectChild("self")}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            selectedChild === "self"
              ? "border-jdav-green bg-green-50 ring-1 ring-jdav-green"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <span className="font-medium text-slate-900">Ich selbst</span>
          {selectedChild === "self" && (
            <div className="h-2 w-2 rounded-full bg-jdav-green" />
          )}
        </button>

        {childrenProfiles.map((child) => (
          <button
            key={child.id}
            type="button"
            aria-label={`${child.full_name} auswählen`}
            onClick={() => onSelectChild(child.id)}
            className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
              selectedChild === child.id
                ? "border-jdav-green bg-green-50 ring-1 ring-jdav-green"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <span className="font-medium text-slate-900">
              {child.full_name}
            </span>
            {selectedChild === child.id && (
              <div className="h-2 w-2 rounded-full bg-jdav-green" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TourRegistrationAgeWarningProps {
  minAge: number;
}

function TourRegistrationAgeWarning({
  minAge,
}: TourRegistrationAgeWarningProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
      <div>
        <p className="font-bold text-orange-800 text-sm">
          Mindestalter nicht erreicht
        </p>
        <p className="text-xs text-orange-700 mt-1 leading-relaxed">
          Dieser Teilnehmer ist zum Tourstart noch unter {minAge} Jahre alt. Die
          Anmeldung wird als **Ausnahme-Anfrage** markiert und muss vom Guide
          manuell bestätigt werden.
        </p>
      </div>
    </div>
  );
}

interface TourRegistrationMaterialSelectorProps {
  availableMaterials: Material[];
  selectedMaterials: Record<string, string>;
  onToggleMaterial: (typeId: string, defaultSize: string) => void;
  onUpdateMaterialSize: (typeId: string, size: string) => void;
}

function TourRegistrationMaterialSelector({
  availableMaterials,
  selectedMaterials,
  onToggleMaterial,
  onUpdateMaterialSize,
}: TourRegistrationMaterialSelectorProps) {
  if (availableMaterials.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">
        Benötigtes Leihmaterial
      </p>
      <div className="grid grid-cols-1 gap-2">
        {availableMaterials.map((material) => {
          const isSelected = material.id in selectedMaterials;

          return (
            <div
              key={material.id}
              className={`flex flex-col rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-jdav-green bg-green-50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                  checked={isSelected}
                  onChange={() =>
                    onToggleMaterial(material.id, material.sizes[0] || "")
                  }
                />
                <span className="font-medium text-slate-700">
                  {material.name}
                </span>
              </label>

              {isSelected && material.sizes.length > 0 && (
                <div className="mt-3 ml-8 flex items-center gap-2">
                  <label
                    htmlFor={`material-size-${material.id}`}
                    className="text-xs font-semibold text-slate-600"
                  >
                    Größe:
                  </label>
                  <select
                    id={`material-size-${material.id}`}
                    aria-label={`Größe für ${material.name}`}
                    className="text-sm rounded-lg border-slate-200 py-1 px-2 focus:ring-jdav-green focus:border-jdav-green bg-white shadow-sm"
                    value={selectedMaterials[material.id] || material.sizes[0]}
                    onChange={(e) =>
                      onUpdateMaterialSize(material.id, e.target.value)
                    }
                    required
                  >
                    {material.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TourRegistrationFormActionsProps {
  isPending: boolean;
  onCancel?: () => void;
}

function TourRegistrationFormActions({
  isPending,
  onCancel,
}: TourRegistrationFormActionsProps) {
  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row-reverse">
      <Button
        type="submit"
        aria-label="Anmeldung abschicken"
        disabled={isPending}
        size="lg"
        className="w-full bg-jdav-green hover:bg-jdav-green-dark text-white font-black h-12 rounded-xl shadow-lg shadow-green-900/10"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verarbeiten...
          </>
        ) : (
          "Anmeldung abschicken"
        )}
      </Button>
      <Button
        type="button"
        aria-label="Abbrechen"
        variant="ghost"
        onClick={onCancel}
        className="w-full text-slate-500 hover:text-slate-900 font-medium"
      >
        Abbrechen
      </Button>
    </div>
  );
}

export function TourRegistrationForm({
  tourId,
  tourStartDate,
  minAge,
  onSuccess,
  onCancel,
  childrenProfiles,
  availableMaterials,
}: TourRegistrationFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>("self");
  const [selectedMaterials, setSelectedMaterials] = useState<
    Record<string, string>
  >({});
  const clientRequestIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const ageTooYoung = calculateIsAgeTooYoung(
    selectedChild,
    childrenProfiles,
    minAge,
    tourStartDate,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("tourId", tourId);
      formData.append("childId", selectedChild);
      formData.append("clientRequestId", clientRequestIdRef.current);

      const materialsData = Object.entries(selectedMaterials).map(
        ([typeId, size]) => ({
          material_type_id: typeId,
          size: size,
        }),
      );
      formData.append("materialsData", JSON.stringify(materialsData));

      const result = await runClientAction(() => registerForTour(formData));

      if (isOfflineQueued(result)) {
        setSuccess(
          "Du bist offline. Deine Anmeldung wurde gespeichert und wird synchronisiert, sobald Du wieder verbunden bist.",
        );
        setTimeout(() => {
          router.refresh();
          if (onSuccess) onSuccess();
        }, 3500);
        return;
      }

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(result.message || "Erfolgreich angemeldet.");
        router.refresh();
        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      }
    } finally {
      setIsPending(false);
    }
  }

  const toggleMaterial = (typeId: string, defaultSize: string) => {
    setSelectedMaterials((prev) => {
      const copy = { ...prev };
      if (typeId in copy) {
        delete copy[typeId];
      } else {
        copy[typeId] = defaultSize;
      }
      return copy;
    });
  };

  const updateMaterialSize = (typeId: string, size: string) => {
    setSelectedMaterials((prev) => ({
      ...prev,
      [typeId]: size,
    }));
  };

  if (success) {
    return <TourRegistrationSuccessView message={success} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <TourRegistrationProfileSelector
        selectedChild={selectedChild}
        onSelectChild={setSelectedChild}
        childrenProfiles={childrenProfiles}
      />

      {ageTooYoung && minAge !== null && (
        <TourRegistrationAgeWarning minAge={minAge} />
      )}

      <TourRegistrationMaterialSelector
        availableMaterials={availableMaterials}
        selectedMaterials={selectedMaterials}
        onToggleMaterial={toggleMaterial}
        onUpdateMaterialSize={updateMaterialSize}
      />

      <TourRegistrationFormActions isPending={isPending} onCancel={onCancel} />
    </form>
  );
}
