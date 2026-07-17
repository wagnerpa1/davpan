"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import {
  previewMemberImport,
  runMemberImport,
} from "@/app/actions/member-import";
import { cn } from "@/lib/utils";

type PreviewRow = {
  membership_number: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  family_number: string;
  category_code: string;
  status: "new" | "update" | "unchanged";
  changeCount: number;
  diffs: Array<{
    label: string;
    currentValue: string;
    incomingValue: string;
    changed: boolean;
  }>;
};

export function MemberImportForm() {
  const [isPending, startTransition] = useTransition();
  const [fileContent, setFileContent] = useState<string>("");
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const inferredType = file.name.toLowerCase().endsWith(".csv")
      ? "csv"
      : "json";

    setFileContent(text);
    setFileType(inferredType);

    startTransition(async () => {
      setError(null);
      setStatus(null);
      try {
        const result = await previewMemberImport(text, inferredType);
        setPreviewRows(result.previewRows);
        setTotalRows(result.totalRows);
      } catch (previewError) {
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Vorschau fehlgeschlagen.",
        );
      }
    });
  };

  const handleImport = () => {
    if (!fileContent) {
      setError("Bitte zuerst eine Datei auswählen.");
      return;
    }

    setError(null);
    setStatus(null);

    startTransition(async () => {
      try {
        const result = await runMemberImport(fileContent, fileType);
        if (!result.success) {
          setError(result.error ?? "Import fehlgeschlagen.");
          return;
        }

        setStatus(`${result.importedRows} Zeilen importiert.`);
      } catch (importError) {
        setError(
          importError instanceof Error
            ? importError.message
            : "Import fehlgeschlagen.",
        );
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Upload className="h-5 w-5 text-jdav-green" />
        <h2 className="text-lg font-semibold text-slate-900">Import starten</h2>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Importdatei
          <input
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={handleFileChange}
            className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="rounded-xl bg-green-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Vorschau</p>
          <p className="mt-1">
            {totalRows > 0
              ? `${totalRows} Datensätze erkannt.`
              : "Noch keine Datei geladen."}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {status}
          </div>
        )}

        <button
          type="button"
          onClick={handleImport}
          disabled={isPending || !fileContent}
          className="w-full rounded-xl bg-jdav-green px-4 py-2 font-semibold text-white transition hover:bg-jdav-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Verarbeite…" : "Import ausführen"}
        </button>
      </div>

      {previewRows.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            Erste Vorschauzeilen mit Änderungen
          </div>
          <div className="max-h-90 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mitgliedsnummer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Änderungen</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Geburt</th>
                  <th className="px-4 py-3">Familie</th>
                  <th className="px-4 py-3">Kategorie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {previewRows.map((row) => (
                  <tr
                    key={`${row.membership_number}-${row.birthdate}`}
                    className="align-top"
                  >
                    <td className="px-4 py-3 font-mono">
                      {row.membership_number}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          row.status === "new"
                            ? "bg-blue-50 text-blue-700"
                            : row.status === "update"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {row.status === "new"
                          ? "Neu"
                          : row.status === "update"
                            ? "Änderung"
                            : "Unverändert"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {row.changeCount}
                    </td>
                    <td className="px-4 py-3">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="px-4 py-3">{row.birthdate}</td>
                    <td className="px-4 py-3">{row.family_number || "-"}</td>
                    <td className="px-4 py-3">{row.category_code || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Feldvergleich der ersten Vorschauzeile
            </h3>
            {previewRows[0]?.diffs.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {previewRows[0].diffs.map((diff) => (
                  <div
                    key={diff.label}
                    className={cn(
                      "rounded-xl border p-3 text-xs",
                      diff.changed
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {diff.label}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          diff.changed
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {diff.changed ? "Ändert sich" : "Unverändert"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-600">
                      <p>
                        <span className="font-medium text-slate-900">
                          Aktuell:
                        </span>{" "}
                        {diff.currentValue}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">
                          Import:
                        </span>{" "}
                        {diff.incomingValue}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Keine Diff-Daten verfügbar.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
