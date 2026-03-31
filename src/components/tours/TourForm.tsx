"use client";

import { Calendar, Info, Mountain, Package, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface TourFormGuide {
  user_id: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

interface TourFormMaterial {
  material_id: string;
}

interface TourFormInitialData {
  title?: string;
  category?: string | null;
  group?: string;
  difficulty?: string;
  target_area?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string | null;
  meeting_point?: string;
  meeting_time?: string;
  elevation?: number | null;
  distance?: number | null;
  duration_hours?: number | null;
  max_participants?: number | null;
  min_age?: number | null;
  status?: string;
  cost_info?: string;
  requirements?: string;
  tour_guides?: TourFormGuide[];
  tour_materials?: TourFormMaterial[];
  resource_bookings?: { resource_id: string }[];
}

interface TourFormProps {
  initialData?: TourFormInitialData;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
  guides?: { id: string; full_name: string }[];
  currentUser?: { id: string; full_name: string };
  availableMaterials?: { id: string; name: string; size: string | null }[];
  availableResources?: { id: string; name: string }[];
  tourGroups?: { id: string; group_name: string }[];
  tourCategories?: { id: string; category: string }[];
}

export function TourForm({
  initialData,
  onSubmit,
  isLoading,
  guides,
  currentUser,
  availableMaterials = [],
  availableResources = [],
  tourGroups = [],
  tourCategories = [],
}: TourFormProps) {
  const router = useRouter();

  // State for selected guides
  const [selectedGuides, setSelectedGuides] = useState<
    { id: string; name: string }[]
  >(() => {
    if (initialData?.tour_guides) {
      return initialData.tour_guides.map((tg) => ({
        id: tg.user_id,
        name: tg.profiles?.full_name || "Unbekannt",
      }));
    }

    // If it's a new tour and we have a current user, auto-select them
    if (!initialData && currentUser) {
      return [{ id: currentUser.id, name: currentUser.full_name }];
    }

    return [];
  });

  // State for selected resources
  const [selectedResources, setSelectedResources] = useState<string[]>(() => {
    if (initialData?.resource_bookings) {
      return initialData.resource_bookings.map((rb) => rb.resource_id);
    }
    return [];
  });

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.currentTarget.form;
    if (!form) return;
    const endDateInput = form.elements.namedItem("end_date");
    if (endDateInput instanceof HTMLInputElement) {
      // Set min date for end_date to start_date
      endDateInput.min = e.currentTarget.value;
      // If end_date is empty or before start_date, sync it
      if (!endDateInput.value || endDateInput.value < e.currentTarget.value) {
        endDateInput.value = e.currentTarget.value;
      }
    }
  };

  const addGuide = (id: string, name: string) => {
    if (!id) return;
    if (selectedGuides.some((g) => g.id === id)) return;
    setSelectedGuides([...selectedGuides, { id, name }]);
  };

  const removeGuide = (id: string) => {
    setSelectedGuides(selectedGuides.filter((g) => g.id !== id));
  };

  return (
    <form action={onSubmit} className="space-y-8">
      {/* Hidden inputs for selected guides/materials/resources to ensure they are sent with FormData */}
      {selectedGuides.map((g) => (
        <input key={g.id} type="hidden" name="guide_ids" value={g.id} />
      ))}
      {initialData?.tour_materials?.map((m) => (
        <input
          key={`init-m-${m.material_id}`}
          type="hidden"
          name="initial_material_ids"
          value={m.material_id}
        />
      ))}
      {selectedResources.map((rid) => (
        <input
          key={`res-${rid}`}
          type="hidden"
          name="resource_ids"
          value={rid}
        />
      ))}

      {/* Basic Info */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Info className="h-5 w-5 text-jdav-green" /> Basisdaten
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Tour-Titel</Label>
            <Input
              id="title"
              name="title"
              defaultValue={initialData?.title}
              required
              placeholder="z.B. Wanderung zum Watzmannhaus"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Kategorie</Label>
              <select
                id="category"
                name="category"
                defaultValue={initialData?.category || ""}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">-- Kategorie wählen --</option>
                {tourCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="group">Zielgruppe</Label>
              <select
                id="group"
                name="group"
                defaultValue={initialData?.group || ""}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">-- Keine spezifiziert --</option>
                {tourGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="difficulty">Schwierigkeit</Label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={initialData?.difficulty || "Keine"}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                {[
                  "T1",
                  "T2",
                  "T3",
                  "T4",
                  "B1",
                  "B2",
                  "B3",
                  "B4",
                  "L",
                  "WS",
                  "ZS",
                  "K1",
                  "K2",
                  "K3",
                  "K4",
                  "WT1",
                  "WT2",
                  "WT3",
                  "WT4",
                  "WT5",
                  "ST2",
                  "ST3",
                  "S0",
                  "S1",
                  "S2",
                  "S3",
                  "S4",
                  "S5",
                  "UIAA 1",
                  "UIAA 2",
                  "UIAA 3",
                  "UIAA 4",
                  "UIAA 5",
                  "UIAA 6",
                  "UIAA 7",
                  "UIAA 8",
                  "Keine",
                ].map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="target_area">Zielregion / Ort</Label>
            <Input
              id="target_area"
              name="target_area"
              defaultValue={initialData?.target_area}
              placeholder="z.B. Berchtesgadener Alpen"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description}
              rows={6}
              placeholder="Details zur Tour..."
              className="mt-1 whitespace-pre-wrap"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Zeilenumbrüche werden übernommen.
            </p>
          </div>
        </div>
      </div>

      {/* Guides Section */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Users className="h-5 w-5 text-jdav-green" /> Zuständige Leiter
        </h3>
        <p className="text-xs text-slate-500 mb-2">
          Wähle die Personen aus, die diese Tour leiten.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              onChange={(e) => {
                const select = e.currentTarget;
                const id = select.value;
                const name = select.options[select.selectedIndex]?.text || "";
                addGuide(id, name);
                select.value = ""; // Reset
              }}
            >
              <option value="">-- Leiter hinzufügen --</option>
              {guides?.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 min-h-10 p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200">
            {selectedGuides.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-1.5 bg-jdav-green/10 text-jdav-green px-3 py-1.5 rounded-full text-xs font-bold border border-jdav-green/20"
              >
                <span>{g.name}</span>
                <button
                  type="button"
                  className="hover:text-red-600 transition-colors ml-1"
                  onClick={() => removeGuide(g.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {selectedGuides.length === 0 && (
              <span className="text-[10px] text-slate-400 self-center px-2">
                Noch keine Leiter ausgewählt
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Materials Section */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Package className="h-5 w-5 text-jdav-green" /> Ausrüstungsverleih
        </h3>
        <p className="text-xs text-slate-500 mb-2">
          Wähle Materialien aus dem Bestand, die Teilnehmer für diese Tour
          direkt mitbuchen können.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {availableMaterials.length > 0 ? (
            availableMaterials.map((material) => {
              const isSelected =
                initialData?.tour_materials?.some(
                  (tm) => tm.material_id === material.id,
                ) || false;
              return (
                <label
                  key={material.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-jdav-green hover:bg-jdav-green/5 transition-colors has-checked:border-jdav-green has-checked:bg-jdav-green/10"
                >
                  <input
                    type="checkbox"
                    name="material_ids"
                    value={material.id}
                    defaultChecked={isSelected}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900 leading-tight">
                      {material.name}
                    </div>
                    {material.size && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Größen: {material.size}
                      </div>
                    )}
                  </div>
                </label>
              );
            })
          ) : (
            <p className="text-sm text-slate-500 italic">
              Kein Material im Bestand gefunden.
            </p>
          )}
        </div>
      </div>

      {/* Resources */}
      {availableResources.length > 0 && (
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
            <Package className="h-5 w-5 text-jdav-green" /> Vereinsressourcen
          </h3>
          <p className="text-sm text-slate-500 mb-2">
            Wähle Ressourcen (z.B. Vereinsbus), die du für diese Tour zwingend
            benötigst. Die Reservierung erfolgt automatisch für den
            Tour-Zeitraum, sofern verfügbar.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
            {availableResources.map((res) => {
              const isSelected = selectedResources.includes(res.id);
              return (
                <label
                  key={res.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:bg-slate-50",
                    isSelected
                      ? "border-jdav-green bg-jdav-green/5 ring-1 ring-jdav-green"
                      : "border-slate-200",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedResources([...selectedResources, res.id]);
                      else
                        setSelectedResources(
                          selectedResources.filter((id) => id !== res.id),
                        );
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-jdav-green focus:ring-jdav-green cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {res.name}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Timing & Location */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Calendar className="h-5 w-5 text-jdav-green" /> Zeit & Ort
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Startdatum</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={initialData?.start_date}
              required
              className="mt-1"
              onChange={handleStartDateChange}
            />
          </div>
          <div>
            <Label htmlFor="end_date">Enddatum</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={initialData?.end_date || initialData?.start_date}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="registration_deadline">
              Anmeldefrist (optional)
            </Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="date"
              defaultValue={initialData?.registration_deadline?.split("T")[0]}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="meeting_point">Treffpunkt</Label>
            <Input
              id="meeting_point"
              name="meeting_point"
              defaultValue={initialData?.meeting_point}
              placeholder="z.B. P&R Parkplatz"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="meeting_time">Zeit (optional)</Label>
            <Input
              id="meeting_time"
              name="meeting_time"
              type="time"
              defaultValue={initialData?.meeting_time}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Mountain className="h-5 w-5 text-jdav-green" /> Tour-Parameter
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="elevation">Aufstieg (hm)</Label>
            <Input
              id="elevation"
              name="elevation"
              type="number"
              defaultValue={initialData?.elevation ?? undefined}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="distance">Strecke (km)</Label>
            <Input
              id="distance"
              name="distance"
              type="number"
              step="0.1"
              defaultValue={initialData?.distance ?? undefined}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="duration_hours">Gehzeit (h)</Label>
            <Input
              id="duration_hours"
              name="duration_hours"
              type="number"
              step="0.5"
              defaultValue={initialData?.duration_hours ?? undefined}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Users className="h-5 w-5 text-jdav-green" /> Organisation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="max_participants">Max. Teilnehmer</Label>
            </div>
            <Input
              id="max_participants"
              name="max_participants"
              type="number"
              defaultValue={initialData?.max_participants ?? undefined}
              placeholder="Unbegrenzt"
              className="mt-0"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="min_age">Mindestalter</Label>
            </div>
            <Input
              id="min_age"
              name="min_age"
              type="number"
              defaultValue={initialData?.min_age ?? undefined}
              placeholder="Kein Mindestalter"
              className="mt-0"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={initialData?.status || "planning"}
              className=" flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
            >
              <option value="planning">Planung</option>
              <option value="open">Anmeldung offen</option>
              <option value="full">Ausgebucht</option>
              <option value="completed">Abgeschlossen</option>
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="cost_info">Kostenhinweis (optional)</Label>
          <Input
            id="cost_info"
            name="cost_info"
            defaultValue={initialData?.cost_info}
            placeholder="z.B. Fahrtkosten ca. 10€"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="requirements">Voraussetzungen</Label>
          <Textarea
            id="requirements"
            name="requirements"
            defaultValue={initialData?.requirements}
            placeholder="Kondition, Trittsicherheit..."
            className="mt-1 whitespace-pre-wrap"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-jdav-green hover:bg-jdav-green-dark text-white font-bold px-8 rounded-xl shadow-md"
        >
          {isLoading
            ? "Speichere..."
            : initialData
              ? "Tour aktualisieren"
              : "Tour erstellen"}
        </Button>
      </div>
    </form>
  );
}
