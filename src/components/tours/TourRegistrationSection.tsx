"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { TourRegistrationModal } from "./TourRegistrationModal";
import { CheckCircle2, Clock } from "lucide-react";

interface Material {
  id: string;
  name: string;
}

interface Child {
  id: string;
  full_name: string;
}

interface Registration {
  user_id: string;
  child_profile_id: string | null;
  status: string;
}

interface TourRegistrationSectionProps {
  tourId: string;
  tourTitle: string;
  tourStatus: string;
  maxParticipants: number | null;
  isLoggedIn: boolean;
  childrenProfiles: Child[];
  availableMaterials: Material[];
  userRegistrations: Registration[];
}

export function TourRegistrationSection({
  tourId,
  tourTitle,
  tourStatus,
  maxParticipants,
  isLoggedIn,
  childrenProfiles,
  availableMaterials,
  userRegistrations
}: TourRegistrationSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-center border border-amber-100">
        <p className="mb-4 text-amber-800 font-medium">
          Du musst angemeldet sein, um dich für Touren einzuschreiben.
        </p>
        <a href="/login">
          <Button variant="outline" className="border-amber-200 bg-white text-amber-800 hover:bg-amber-100">
            Zum Login
          </Button>
        </a>
      </div>
    );
  }

  const selfRegistration = userRegistrations.find(r => r.child_profile_id === null);
  const registeredChildIds = userRegistrations.map(r => r.child_profile_id).filter(Boolean);
  
  const allRegistered = selfRegistration && (childrenProfiles.length === 0 || childrenProfiles.every(c => registeredChildIds.includes(c.id)));

  return (
    <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
      <div className="flex-1">
        <p className="font-bold text-slate-900 text-lg">
          {tourStatus === "open" ? "Anmeldung geöffnet" : (tourStatus === "full" ? "Warteliste aktiv" : "Keine Anmeldung möglich")}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Teilnehmerlimit: {maxParticipants || "Unbegrenzt"}
        </p>
        
        {userRegistrations.length > 0 && (
          <div className="mt-3 space-y-2">
            {selfRegistration && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Du bist angemeldet ({selfRegistration.status})</span>
              </div>
            )}
            {userRegistrations.filter(r => r.child_profile_id).map(reg => {
              const child = childrenProfiles.find(c => c.id === reg.child_profile_id);
              return (
                <div key={reg.child_profile_id} className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{child?.full_name || "Kind"} ist angemeldet ({reg.status})</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full sm:w-auto">
        <Button 
          size="lg" 
          className="w-full sm:w-auto bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-12 px-8 rounded-xl"
          disabled={tourStatus === "planning" || tourStatus === "completed" || (tourStatus !== "full" && allRegistered)}
          onClick={() => setIsModalOpen(true)}
        >
          {tourStatus === "full" ? "Auf Warteliste eintragen" : (allRegistered ? "Bereits angemeldet" : "Anmelden")}
        </Button>
      </div>

      <TourRegistrationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tourId={tourId}
        tourTitle={tourTitle}
        childrenProfiles={childrenProfiles}
        availableMaterials={availableMaterials}
      />
    </div>
  );
}
