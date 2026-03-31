"use client";

import {
  AlertCircle,
  AlertTriangle,
  CameraOff,
  Phone,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  status: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    emergency_phone: string | null;
    medical_notes: string | null;
    image_consent: boolean;
  } | null;
  child_profiles?: {
    full_name: string | null;
    medical_notes: string | null;
    image_consent: boolean;
  } | null;
}

interface ParticipantPopupProps {
  participants: Participant[];
}

export function ParticipantPopup({ participants }: ParticipantPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (participants.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border-slate-200 bg-white shadow-sm hover:border-jdav-green hover:bg-slate-50"
      >
        <Users className="h-4 w-4 text-jdav-green" />
        Teilnehmerliste einsehen
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in transition-all">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-jdav-green/10 p-2 text-jdav-green">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Teilnehmerliste
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nur für Guides & Admins sichtbar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {participants.map((p) => {
                  const name =
                    p.profiles?.full_name ||
                    p.child_profiles?.full_name ||
                    "Unbekannt";
                  const medical =
                    p.profiles?.medical_notes ||
                    p.child_profiles?.medical_notes;
                  const consent =
                    p.profiles?.image_consent ??
                    p.child_profiles?.image_consent ??
                    false;
                  const phone = p.profiles?.phone;
                  const emergency = p.profiles?.emergency_phone;

                  return (
                    <div
                      key={p.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-jdav-green hover:bg-white hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900">{name}</h4>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                consent
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700",
                              )}
                            >
                              {consent
                                ? "Foto Einverstanden"
                                : "Keine Foto-Einwilligung"}
                              {!consent && (
                                <CameraOff className="h-2.5 w-2.5" />
                              )}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              {p.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 text-sm">
                          {phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="h-3.5 w-3.5 text-jdav-green" />
                              <a
                                href={`tel:${phone}`}
                                className="hover:underline"
                              >
                                {phone}
                              </a>
                            </div>
                          )}
                          {emergency && (
                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-[10px] uppercase text-slate-400">
                                Notfall:
                              </span>
                              <a
                                href={`tel:${emergency}`}
                                className="text-amber-700 hover:underline"
                              >
                                {emergency}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {medical && (
                        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                          <div className="flex items-center gap-2 mb-1 font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            Medizinische Hinweise:
                          </div>
                          {medical}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t bg-slate-50 p-6">
              <Button
                type="button"
                className="w-full rounded-2xl bg-jdav-green hover:bg-jdav-green-dark"
                onClick={() => setIsOpen(false)}
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
