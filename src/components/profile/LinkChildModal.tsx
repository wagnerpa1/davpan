"use client";

import { Info, Link2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { linkChildByMemberNumber } from "@/app/actions/child-profiles";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatMembershipNumber(input: string) {
  const digitsOnly = input.replace(/\D/g, "");
  const limited = digitsOnly.slice(0, 11);

  if (limited.length <= 3) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 3)}-${limited.slice(3)}`;

  return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
}

export function LinkChildModal() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [memberNumber, setMemberNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        setIsOpen(false);
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, []);

  const handleMemberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMemberNumber(formatMembershipNumber(e.target.value));
  };

  const handleOpen = () => {
    setError(null);
    setSuccessMsg(null);
    setMemberNumber("");
    setBirthdate("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccessMsg(null);

    const rawNumber = (formData.get("memberNumber") as string) || memberNumber;
    const bDate = (formData.get("birthdate") as string) || birthdate;

    if (!rawNumber || !bDate) {
      setError("Bitte Mitgliedsnummer und Geburtsdatum angeben.");
      return;
    }

    try {
      const res = await linkChildByMemberNumber({
        memberNumber: rawNumber,
        birthdate: bDate,
      });

      if (!res.success) {
        setError(res.error?.message || "Fehler beim Verknüpfen des Kindes.");
        return;
      }

      setSuccessMsg(
        `Kind "${res.data?.child.full_name}" erfolgreich verknüpft!`,
      );
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Fehler beim Verknüpfen des Kindes.",
      );
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        className="border-jdav-green text-jdav-green hover:bg-green-50 flex items-center gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Kind über Mitgliedsnummer verknüpfen
      </Button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        aria-labelledby="link-child-title"
        className="fixed inset-0 m-auto z-50 bg-transparent p-4 max-w-md w-full border-none backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95"
      >
        <div className="bg-white rounded-2xl shadow-xl w-full p-6 relative border border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-green-100 text-jdav-green">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h3
                id="link-child-title"
                className="text-lg font-bold text-slate-900"
              >
                Kind verknüpfen
              </h3>
              <p className="text-xs text-slate-500">
                DAV-Mitgliederdatenbank (Sektion Pfarrkirchen)
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Verknüpfe dein Kind direkt über dessen DAV-Mitgliedsnummer. Der Name
            wird automatisch verifiziert übernommen.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700 font-medium">
              {successMsg}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="link-child-membership"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Mitgliedsnummer des Kindes
              </label>
              <Input
                id="link-child-membership"
                name="memberNumber"
                placeholder="209-00-001234"
                value={memberNumber}
                onChange={handleMemberChange}
                maxLength={14}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Format: 209-00-001234 (11 Ziffern)
              </p>
            </div>

            <div>
              <label
                htmlFor="link-child-birthdate"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Geburtsdatum des Kindes
              </label>
              <Input
                id="link-child-birthdate"
                name="birthdate"
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
              />
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Kinder ab 18 Jahren verwalten ihr Konto selbstständig. Nach der
                Verknüpfung kannst du Tourenanmeldungen für dein Kind vornehmen.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <AnimatedSubmitButton
                successKey="link-child"
                className="bg-jdav-green hover:bg-jdav-green-dark text-white"
              >
                Kind verbinden
              </AnimatedSubmitButton>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
