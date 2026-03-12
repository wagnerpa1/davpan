"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";
import { 
  Mountain, MapPin, Calendar, Clock, 
  Users, Info, X 
} from "lucide-react";

interface TourFormProps {
  initialData?: any;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
  guides?: { id: string; full_name: string }[];
}

export function TourForm({ initialData, onSubmit, isLoading, guides }: TourFormProps) {
  const router = useRouter();
  
  // State for selected guides
  const [selectedGuides, setSelectedGuides] = useState<{id: string, name: string}[]>(
    initialData?.tour_guides?.map((tg: any) => ({
      id: tg.user_id,
      name: tg.profiles?.full_name || "Unbekannt"
    })) || []
  );

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as any;
    const form = target.form;
    if (!form) return;
    const endDateInput = form.elements.namedItem("end_date") as any;
    if (endDateInput && !endDateInput.value) {
      endDateInput.value = target.value;
    }
  };

  const addGuide = (id: string, name: string) => {
    if (!id) return;
    if (selectedGuides.some(g => g.id === id)) return;
    setSelectedGuides([...selectedGuides, { id, name }]);
  };

  const removeGuide = (id: string) => {
    setSelectedGuides(selectedGuides.filter(g => g.id !== id));
  };

  return (
    <form action={onSubmit} className="space-y-8">
      {/* Hidden inputs for selected guides to ensure they are sent with FormData */}
      {selectedGuides.map(g => (
        <input key={g.id} type="hidden" name="guide_ids" value={g.id} />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Kategorie</Label>
              <select 
                id="category" 
                name="category" 
                defaultValue={initialData?.category || "wandern"}
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="wandern">Wandern</option>
                <option value="klettersteig">Klettersteig</option>
                <option value="klettern">Klettern</option>
                <option value="mehrseillaenge">Mehrseillänge</option>
                <option value="kletterhalle">Kletterhalle</option>
                <option value="kanu">Kanu</option>
                <option value="mountainbike">Mountainbike</option>
                <option value="camp">Camp</option>
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
                  "T1", "T2", "T3", "T4", "B1", "B2", "B3", "B4", "L", "WS", "ZS", 
                  "K1", "K2", "K3", "K4", "WT1", "WT2", "WT3", "WT4", "WT5", 
                  "ST2", "ST3", "S0", "S1", "S2", "S3", "S4", "S5", 
                  "UIAA 1", "UIAA 2", "UIAA 3", "UIAA 4", "UIAA 5", "UIAA 6", "UIAA 7", "UIAA 8", 
                  "Keine"
                ].map((diff) => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>
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
            <p className="text-[10px] text-slate-400 mt-1">Zeilenumbrüche werden übernommen.</p>
          </div>
        </div>
      </div>

      {/* Guides Section */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 border-b border-slate-50 pb-2">
          <Users className="h-5 w-5 text-jdav-green" /> Zuständige Leiter
        </h3>
        <p className="text-xs text-slate-500 mb-2">Wähle die Personen aus, die diese Tour leiten.</p>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <select 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              onChange={(e) => {
                const select = e.target as any;
                const id = select.value;
                const name = select.options[select.selectedIndex].text;
                addGuide(id, name);
                select.value = ""; // Reset
              }}
            >
              <option value="">-- Leiter hinzufügen --</option>
              {guides?.map((guide) => (
                <option key={guide.id} value={guide.id}>{guide.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200">
            {selectedGuides.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5 bg-jdav-green/10 text-jdav-green px-3 py-1.5 rounded-full text-xs font-bold border border-jdav-green/20">
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
              <span className="text-[10px] text-slate-400 self-center px-2">Noch keine Leiter ausgewählt</span>
            )}
          </div>
        </div>
      </div>

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
            <Label htmlFor="difficulty">Schwierigkeit (T1-T6)</Label>
            <Input 
              id="difficulty" 
              name="difficulty" 
              type="number" 
              min="1" 
              max="6" 
              defaultValue={initialData?.difficulty} 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="elevation">Aufstieg (hm)</Label>
            <Input 
              id="elevation" 
              name="elevation" 
              type="number" 
              defaultValue={initialData?.elevation} 
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
              defaultValue={initialData?.distance} 
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
              defaultValue={initialData?.duration_hours} 
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_participants">Max. Teilnehmer</Label>
            <Input 
              id="max_participants" 
              name="max_participants" 
              type="number" 
              defaultValue={initialData?.max_participants} 
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select 
              id="status" 
              name="status" 
              defaultValue={initialData?.status || "planning"}
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
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
           {isLoading ? "Speichere..." : (initialData ? "Tour aktualisieren" : "Tour erstellen")}
         </Button>
      </div>
    </form>
  );
}
