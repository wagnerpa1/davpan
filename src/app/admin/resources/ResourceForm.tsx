"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createOrUpdateResource } from "@/app/actions/admin-resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ResourceFormInitialData {
  id: string;
  name: string;
  type: string | null;
  capacity: number | null;
  description: string | null;
}

export function ResourceForm({
  initialData,
}: {
  initialData?: ResourceFormInitialData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const res = await createOrUpdateResource(formData);
      if (res?.error) {
        alert(res.error);
      } else {
        router.push("/admin/resources");
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}

      <div>
        <Label htmlFor="name">Name der Ressource</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initialData?.name}
          placeholder="z.B. Vereinsbus (Bully)"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="type">Art der Ressource</Label>
        <select
          id="type"
          name="type"
          defaultValue={initialData?.type ?? "fahrzeug"}
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jdav-green"
        >
          <option value="fahrzeug">Fahrzeug</option>
          <option value="raum">Raum</option>
          <option value="ausrüstung">Ausrüstung (Beamer etc.)</option>
        </select>
      </div>

      <div>
        <Label htmlFor="capacity">Kapazität (optional)</Label>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          defaultValue={initialData?.capacity ?? undefined}
          placeholder="z.B. 9 (für Sitzplätze)"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description ?? undefined}
          placeholder="Infos zu Schlüsseln, Standort, Besonderheiten..."
          className="mt-1"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          className="bg-jdav-green text-white hover:bg-jdav-green-dark"
          disabled={isPending}
        >
          {isPending ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
