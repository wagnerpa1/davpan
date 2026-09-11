import { User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountTypeSelectorProps {
  isParent: boolean;
  onSelectParent: (isParent: boolean) => void;
}

export function AccountTypeSelector({
  isParent,
  onSelectParent,
}: AccountTypeSelectorProps) {
  return (
    <fieldset>
      <legend className="block mb-3 text-sm font-semibold text-slate-900">
        Wie möchtest du starten?
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSelectParent(false)}
          className={cn(
            "relative p-4 rounded-2xl border-2 transition-shadow duration-200 hover:shadow-md",
            !isParent
              ? "border-jdav-green bg-green-50 shadow-md shadow-green-200"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
          )}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div
              className={cn(
                "p-2 rounded-xl transition-colors duration-200",
                !isParent
                  ? "bg-jdav-green text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Mitglied aktivieren
              </p>
              <p className="text-xs text-slate-600">
                Mit Mitgliedsnummer und Geburtsdatum
              </p>
            </div>
          </div>
          {!isParent && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-jdav-green rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectParent(true)}
          className={cn(
            "relative p-4 rounded-2xl border-2 transition-shadow duration-200 hover:shadow-md",
            isParent
              ? "border-jdav-green bg-green-50 shadow-md shadow-green-200"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
          )}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div
              className={cn(
                "p-2 rounded-xl transition-colors duration-200",
                isParent
                  ? "bg-jdav-green text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Familienzugang
              </p>
              <p className="text-xs text-slate-600">
                Für Eltern und Familienverwaltung
              </p>
            </div>
          </div>
          {isParent && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-jdav-green rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </button>
      </div>
    </fieldset>
  );
}
