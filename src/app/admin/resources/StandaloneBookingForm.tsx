"use client";

import { Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { bookResourceStandalone } from "@/app/actions/admin-resources";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Resource {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  capacity: number | null;
}

interface StandaloneBookingFormProps {
  resources: Resource[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StandaloneBookingForm({
  resources,
  onSuccess,
  onCancel,
}: StandaloneBookingFormProps) {
  const [resourceId, setResourceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resources.length > 0 && !resourceId) {
      setResourceId(resources[0].id);
    }
  }, [resources, resourceId]);

  const validateForm = () => {
    if (!resourceId) {
      setError("Bitte wählen Sie eine Ressource.");
      return false;
    }
    if (!startDate) {
      setError("Bitte geben Sie das Startdatum ein.");
      return false;
    }
    if (!endDate) {
      setError("Bitte geben Sie das Enddatum ein.");
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("Das Enddatum muss nach dem Startdatum liegen.");
      return false;
    }
    if (!reason.trim()) {
      setError("Bitte geben Sie einen Grund für die Reservierung ein.");
      return false;
    }
    if (reason.trim().length < 20) {
      setError("Der Grund sollte mindestens 20 Zeichen lang sein.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await bookResourceStandalone(
        resourceId,
        startDate,
        endDate,
        reason,
      );

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setResourceId(resources[0]?.id || "");
        setStartDate("");
        setEndDate("");
        setReason("");

        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ein unbekannter Fehler ist aufgetreten.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg md:w-[500px] animate-in zoom-in-95">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Ressource außerhalb einer Tour reservieren
            </h3>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
                disabled={isLoading}
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            )}
          </div>

          {/* Resource Selection */}
          <div>
            <Label
              htmlFor="resourceSelect"
              className="block text-sm font-medium"
            >
              Ressource *
            </Label>
            <select
              id="resourceSelect"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              disabled={isLoading}
              className="mt-2 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">-- Wählen Sie eine Ressource --</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name || "Unbenannte Ressource"}
                  {resource.type && ` (${resource.type})`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="block text-sm font-medium">
                Startdatum *
              </Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="block text-sm font-medium">
                Enddatum *
              </Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Reason / Purpose */}
          <div>
            <Label htmlFor="reason" className="block text-sm font-medium">
              Grund / Anlass der Reservierung *
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              placeholder="z.B. Vereinsevent am 15. Juni, Tourenleiter-Schulung, etc."
              maxLength={300}
              rows={3}
              className="mt-2 resize-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              {reason.length}/300 Zeichen
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
              <span>✓</span> Ressource erfolgreich reserviert!
            </div>
          )}

          {/* Conflict Notice */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <Calendar className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Falls während des Zeitraums bereits eine Tour-Reservierung
              besteht, wird die Buchung abgelehnt.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="mt-6 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !resourceId}
              className="mt-6 inline-flex rounded-xl bg-jdav-green px-4 py-2 text-base font-semibold text-white hover:bg-jdav-green-dark disabled:opacity-50"
            >
              {isLoading ? "Wird reserviert..." : "Reservierung erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
