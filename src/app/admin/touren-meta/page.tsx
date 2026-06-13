import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";
import { TourMetadataManager } from "./TourMetadataManager";

interface LookupEntry {
  id: string;
  category?: string | null;
  group_name?: string | null;
  created_at: string;
}

export const metadata: Metadata = {
  title: "Admin - Tourkategorien & Gruppen",
};

export default async function AdminTourMetadataPage() {
  const [authContext, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!isAdminRole(authContext.role)) {
    redirect("/");
  }

  const [{ data: categories }, { data: groups }] = await Promise.all([
    supabase
      .from("tour_categorys")
      .select("id, category, created_at")
      .order("category", { ascending: true }),
    supabase
      .from("tour_groups")
      .select("id, group_name, created_at")
      .order("group_name", { ascending: true }),
  ]);

  const normalizedCategories = ((categories ?? []) as LookupEntry[]).map(
    (entry) => ({
      id: entry.id,
      name: entry.category ?? null,
      created_at: entry.created_at,
    }),
  );

  const normalizedGroups = ((groups ?? []) as LookupEntry[]).map((entry) => ({
    id: entry.id,
    name: entry.group_name ?? null,
    created_at: entry.created_at,
  }));

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 flex flex-col gap-4 lg:mb-12">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Tourkategorien und Gruppen
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Pflegen der Stammdaten, die im Tourenbereich für Auswahlfelder,
              Filter und Benachrichtigungen verwendet werden.
            </p>
          </div>
        </div>
      </div>

      <TourMetadataManager
        categories={normalizedCategories}
        groups={normalizedGroups}
      />
    </div>
  );
}
