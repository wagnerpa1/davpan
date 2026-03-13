"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourFiltersProps {
  categories: string[];
  difficulties: string[];
  guides: { id: string; full_name: string }[];
}

export function TourFilters({ categories, difficulties, guides }: TourFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Current filter values from URL
  const currentCategory = searchParams.get("category") || "";
  const currentDifficulty = searchParams.get("difficulty") || "";
  const currentGuide = searchParams.get("guide") || "";
  const currentGroup = searchParams.get("group") || "";
  const currentAvailability = searchParams.get("available") || "";
  const currentSort = searchParams.get("sort") || "date_asc";

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`/touren?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push("/touren", { scroll: false });
  };

  const hasActiveFilters = currentCategory || currentDifficulty || currentGuide || currentGroup || currentAvailability;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all shadow-sm w-full sm:w-auto",
            isOpen || hasActiveFilters 
              ? "border-jdav-green bg-jdav-green/5 text-jdav-green" 
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          )}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters ? "Filter aktiv" : "Filtern"}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sortierung:</span>
          <select 
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="flex-1 sm:flex-none max-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-jdav-green"
          >
            <option value="date_asc">Datum (Anstehend)</option>
            <option value="date_desc">Datum (Abstehend)</option>
            <option value="capacity_low">Kapazität (Voll zuerst)</option>
            <option value="capacity_high">Kapazität (Leer zuerst)</option>
          </select>
        </div>
      </div>

      {isOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tour-Art</label>
              <select 
                value={currentCategory}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Arten</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="capitalize">{cat}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Schwierigkeit</label>
              <select 
                value={currentDifficulty}
                onChange={(e) => updateFilters({ difficulty: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Grade</option>
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>

            {/* Guide */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Leitung</label>
              <select 
                value={currentGuide}
                onChange={(e) => updateFilters({ guide: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Leiter</option>
                {guides.map(guide => (
                  <option key={guide.id} value={guide.id}>{guide.full_name}</option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Zielgruppe</label>
              <select 
                value={currentGroup}
                onChange={(e) => updateFilters({ group: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Gruppen</option>
                <option value="general">Allgemein</option>
                <option value="family">Familie</option>
                <option value="youth">Jugend</option>
              </select>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Verfügbarkeit</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-jdav-green">
                  <input 
                    type="checkbox" 
                    checked={currentAvailability === "true"}
                    onChange={(e) => updateFilters({ available: e.target.checked ? "true" : null })}
                    className="rounded text-jdav-green focus:ring-jdav-green h-4 w-4"
                  />
                  Nur freie Plätze
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-50 pt-4">
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Filter zurücksetzen
              </button>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              className="bg-jdav-green text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-jdav-green-dark transition-all"
            >
              Anwenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
