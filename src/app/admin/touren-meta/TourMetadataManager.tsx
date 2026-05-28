"use client";

import {
  Loader2,
  Tags,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteTourCategory,
  deleteTourGroup,
  saveTourCategory,
  saveTourGroup,
} from "@/app/actions/admin-tour-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LookupEntry {
  id: string;
  name: string | null;
  created_at: string;
}

interface LookupSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  fieldName: "category" | "group_name";
  entries: LookupEntry[];
  createAction: (formData: FormData) => Promise<{ error?: string | null }>;
  deleteAction: (id: string) => Promise<{ error?: string | null }>;
  placeholder: string;
  createLabel: string;
  emptyLabel: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function LookupSection({
  title,
  description,
  icon: Icon,
  fieldName,
  entries,
  createAction,
  deleteAction,
  placeholder,
  createLabel,
  emptyLabel,
}: LookupSectionProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitLookupForm(
    key: string,
    formData: FormData,
    action: (data: FormData) => Promise<{ error?: string | null }>,
    formElement?: HTMLFormElement | null,
  ) {
    setPendingKey(key);
    setErrorMessage(null);

    const result = await action(formData);

    setPendingKey(null);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    formElement?.reset();
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-jdav-green/10 p-3 text-jdav-green">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      )}

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const formData = new FormData(formElement);
          void submitLookupForm(
            `create-${fieldName}`,
            formData,
            createAction,
            formElement,
          );
        }}
      >
        <Input
          name={fieldName}
          required
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="submit"
          className="bg-jdav-green text-white hover:bg-jdav-green-dark"
          disabled={pendingKey === `create-${fieldName}`}
        >
          {pendingKey === `create-${fieldName}` ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {createLabel}
        </Button>
      </form>

      <div className="mt-8 space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const saveKey = `save-${fieldName}-${entry.id}`;
            const deleteKey = `delete-${fieldName}-${entry.id}`;

            return (
              <form
                key={entry.id}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formElement = event.currentTarget;
                  const formData = new FormData(formElement);
                  void submitLookupForm(
                    saveKey,
                    formData,
                    createAction,
                    formElement,
                  );
                }}
              >
                <input type="hidden" name="id" value={entry.id} />
                <div>
                  <label
                    htmlFor={`${fieldName}-${entry.id}`}
                    className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
                  >
                    Name
                  </label>
                  <Input
                    id={`${fieldName}-${entry.id}`}
                    name={fieldName}
                    defaultValue={entry.name ?? ""}
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Erstellt {formatDate(entry.created_at)}
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  disabled={pendingKey === saveKey}
                >
                  {pendingKey === saveKey ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Speichern
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={pendingKey === deleteKey}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `${title} wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.`,
                      )
                    ) {
                      return;
                    }

                    setErrorMessage(null);
                    setPendingKey(deleteKey);
                    void (async () => {
                      const result = await deleteAction(entry.id);
                      setPendingKey(null);

                      if (result.error) {
                        setErrorMessage(result.error);
                        return;
                      }

                      router.refresh();
                    })();
                  }}
                >
                  {pendingKey === deleteKey ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Löschen
                </Button>
              </form>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}

interface TourMetadataManagerProps {
  categories: LookupEntry[];
  groups: LookupEntry[];
}

export function TourMetadataManager({
  categories,
  groups,
}: TourMetadataManagerProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <LookupSection
          title="Tour-Kategorien"
          description="Pflegt die Kategorien, die in Tourformularen, Filtern und Berichten verwendet werden."
          icon={Tags}
          fieldName="category"
          entries={categories}
          createAction={saveTourCategory}
          deleteAction={deleteTourCategory}
          placeholder="z. B. Wandern"
          createLabel="Kategorie anlegen"
          emptyLabel="Noch keine Tour-Kategorien vorhanden."
        />

        <LookupSection
          title="Tour-Gruppen"
          description="Verwaltet die Gruppen, die Touren, Benachrichtigungen und Auswertungen bündeln."
          icon={Users}
          fieldName="group_name"
          entries={groups}
          createAction={saveTourGroup}
          deleteAction={deleteTourGroup}
          placeholder="z. B. Jugendgruppe"
          createLabel="Gruppe anlegen"
          emptyLabel="Noch keine Tour-Gruppen vorhanden."
        />
      </div>
    </div>
  );
}