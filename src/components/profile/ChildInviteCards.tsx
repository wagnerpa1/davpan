"use client";

import { Check, Copy, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createChildProfileInvite,
  redeemChildProfileInvite,
} from "@/app/actions/child-profiles";
import { AnimatedSubmitButton } from "@/components/ui/AnimatedSubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedeemChildInviteForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccessMsg(null);
    const code = formData.get("code") as string;
    const birthdate = formData.get("birthdate") as string;

    if (!code || !birthdate) {
      setError("Bitte Code und Geburtsdatum eingeben.");
      return;
    }

    try {
      const res = await redeemChildProfileInvite(code, birthdate);
      if (!res.success) {
        setError(res.error?.message ?? "Fehler beim Einlösen.");
        return;
      }

      setSuccessMsg("Kind erfolgreich verknüpft.");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler beim Einlösen.");
    }
  };

  return (
    <div className="bg-green-50 p-3 rounded-card border border-green-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Einladungscode einlösen
      </h3>
      <p className="text-slate-600 mb-4 text-sm">
        Wenn der andere Elternteil bereits ein Profil für euer Kind angelegt
        hat, kannst du hier den Einladungscode eingeben, um ebenfalls auf dieses
        Profil zugreifen zu können. Zur Sicherheit musst du auch das
        Geburtsdatum des Kindes eingeben.
      </p>

      {error && (
        <div className="mb-4 text-red-600 text-sm font-medium">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 text-green-700 text-sm font-medium">
          {successMsg}
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="code"
            className="block text-sm font-medium text-slate-700"
          >
            Einladungscode (UUID)
          </label>
          <Input
            id="code"
            name="code"
            placeholder="z.B. 123e4567-e89b-12d3..."
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="birthdate"
            className="block text-sm font-medium text-slate-700"
          >
            Geburtsdatum des Kindes
          </label>
          <Input type="date" id="birthdate" name="birthdate" required />
        </div>
        <AnimatedSubmitButton
          successKey="redeem-invite"
          className="w-full flex items-center justify-center gap-2"
        >
          <PlusCircle className="h-5 w-5" />
          Code einlösen & Kind verknüpfen
        </AnimatedSubmitButton>
      </form>
    </div>
  );
}

export function CreateChildInviteAction({ childId }: { childId: string }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setInviteCode(null);
    try {
      const res = await createChildProfileInvite(childId);
      if (!res.success) {
        setError(res.error?.message ?? "Fehler beim Generieren des Codes.");
        return;
      }

      if (!res.data?.invite?.code) {
        setError("Einladungscode konnte nicht erstellt werden.");
        return;
      }

      setInviteCode(res.data.invite.code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Fehler.");
    }
  };

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h4 className="text-sm font-semibold text-slate-800 mb-2">
        Profil für 2. Elternteil freigeben
      </h4>
      <p className="text-xs text-slate-600 mb-4">
        Generiere einen Code, den der 2. Elternteil in seinem Profil einlösen
        kann. Der Code ist 7 Tage gültig und kann nur einmal verwendet werden.
      </p>

      {!inviteCode && (
        <form action={handleCreate}>
          <Button variant="outline" type="submit" className="w-full">
            Einladungscode generieren
          </Button>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </form>
      )}

      {inviteCode && (
        <div className="flex flex-col gap-2">
          <div className="flex bg-white border border-slate-200 rounded-card p-2 justify-between items-center">
            <code className="text-xs font-mono text-slate-800 break-all">
              {inviteCode}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 ml-2"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Gib dem anderen Elternteil diesen Code UND das Geburtsdatum des
            Kindes (Zur Validierung).
          </p>
        </div>
      )}
    </div>
  );
}

export function RedeemChildInvitePopup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
        Einladungscode einlösen
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-3 animate-in fade-in duration-200">
          <button
            aria-label="Popup schließen"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
            type="button"
          />

          <div className="relative w-full max-w-lg rounded-card bg-white shadow-2xl border border-slate-200 p-3 sm:p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">
                Kind mit Einladungscode verknüpfen
              </h4>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <RedeemChildInviteForm />
          </div>
        </div>
      )}
    </>
  );
}
