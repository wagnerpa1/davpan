"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mountain,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { createTourAction } from "@/app/actions/tour-management";
import { TourForm } from "@/components/tours/TourForm";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-runner";

interface NewTourFormClientProps {
  guides: { id: string; full_name: string }[];
  currentUser: { id: string; full_name: string };
  availableMaterials: { id: string; name: string; size: string | null }[];
  availableResources: { id: string; name: string }[];
  tourGroups: { id: string; group_name: string }[];
  tourCategories: { id: string; category: string }[];
}

const INITIAL_STATE: ActionState<{ tourId: string; title: string }> = {
  success: false,
};

export function NewTourFormClient({
  guides,
  currentUser,
  availableMaterials,
  availableResources,
  tourGroups,
  tourCategories,
}: NewTourFormClientProps) {
  const [state, formAction, isPending] = useActionState(
    createTourAction,
    INITIAL_STATE,
  );

  /** Remount key — forces TourForm to reset when user wants another tour */
  const [formKey, setFormKey] = useState(0);

  const handleCreateAnother = useCallback(() => {
    setFormKey((k) => k + 1);
  }, []);

  if (state.success && state.data) {
    return (
      <TourCreatedSuccess
        tourId={state.data.tourId}
        title={state.data.title}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return (
    <div className="relative">
      {/* Loading overlay — blocks interaction while the server action is in-flight */}
      {isPending && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
            <Loader2 className="h-10 w-10 animate-spin text-jdav-green" />
            <p className="text-base font-semibold text-slate-700">
              Tour wird gespeichert…
            </p>
            <p className="text-sm text-slate-400">Bitte warten</p>
          </div>
        </div>
      )}

      {/* Error banner from last attempt */}
      {!state.success && state.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Speichern fehlgeschlagen</p>
              <p className="text-sm">{state.error.message}</p>
            </div>
          </div>
        </div>
      )}

      <TourForm
        key={formKey}
        onSubmit={formAction}
        isLoading={isPending}
        guides={guides}
        currentUser={currentUser}
        availableMaterials={availableMaterials}
        availableResources={availableResources}
        tourGroups={tourGroups}
        tourCategories={tourCategories}
      />
    </div>
  );
}

interface TourCreatedSuccessProps {
  tourId: string;
  title: string;
  onCreateAnother: () => void;
}

function TourCreatedSuccess({
  tourId,
  title,
  onCreateAnother,
}: TourCreatedSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-jdav-green/10">
        <CheckCircle2 className="h-10 w-10 text-jdav-green" />
      </div>

      <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">
        Tour erfolgreich erstellt!
      </h2>
      <p className="mb-8 max-w-sm text-sm text-slate-500">
        <span className="font-semibold text-slate-700">„{title}"</span> wurde
        gespeichert und ist jetzt in der Tourenliste sichtbar.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button
          asChild
          className="bg-jdav-green hover:bg-jdav-green-dark rounded-xl px-6 font-bold text-white shadow-md"
        >
          <Link href={`/touren/${tourId}`}>
            <Mountain className="mr-2 h-4 w-4" />
            Tour ansehen
          </Link>
        </Button>

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onCreateAnother}
        >
          <Plus className="mr-2 h-4 w-4" />
          Weitere Tour erstellen
        </Button>
      </div>
    </div>
  );
}
