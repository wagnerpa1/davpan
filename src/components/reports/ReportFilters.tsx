"use client";

import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  categories: { id: string; category: string }[];
  groups: { id: string; group_name: string }[];
  years: number[];
}

export function ReportFilters({
  categories,
  groups,
  years,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Current filter values from URL
  const currentCategory = searchParams.get("category") || "";
  const currentYear = searchParams.get("year") || "";
  const currentGroup = searchParams.get("group") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`/berichte?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push("/berichte", { scroll: false });
  };

  const hasActiveFilters = currentCategory || currentYear || currentGroup;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all shadow-sm w-full sm:w-auto",
            isOpen || hasActiveFilters
              ? "border-jdav-green bg-jdav-green/5 text-jdav-green"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
          )}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters ? "Filter aktiv" : "Filtern"}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto overflow-hidden">
          <label
            htmlFor="report-sort"
            className="text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
          >
            Sortierung:
          </label>
          <select
            id="report-sort"
            aria-label="Sortierung"
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="flex-1 sm:flex-none max-w-50 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-jdav-green"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="title_asc">Alphabetisch (A-Z)</option>
          </select>
        </div>
      </div>

      {isOpen && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 relative z-50">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Year */}
            <div className="space-y-2">
              <label
                htmlFor="filter-year"
                className="text-xs font-black uppercase tracking-widest text-slate-600"
              >
                Jahr
              </label>
              <select
                id="filter-year"
                aria-label="Jahr"
                value={currentYear}
                onChange={(e) => updateFilters({ year: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Jahre</option>
                {years.map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label
                htmlFor="filter-category"
                className="text-xs font-black uppercase tracking-widest text-slate-600"
              >
                Kategorie
              </label>
              <select
                id="filter-category"
                aria-label="Kategorie"
                value={currentCategory}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Kategorien</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="capitalize">
                    {cat.category}
                  </option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div className="space-y-2">
              <label
                htmlFor="filter-group"
                className="text-xs font-black uppercase tracking-widest text-slate-600"
              >
                Zielgruppe
              </label>
              <select
                id="filter-group"
                aria-label="Zielgruppe"
                value={currentGroup}
                onChange={(e) => updateFilters({ group: e.target.value })}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
              >
                <option value="">Alle Gruppen</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-50 pt-4">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Filter zurücksetzen
              </button>
            )}
            <button
              type="button"
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
