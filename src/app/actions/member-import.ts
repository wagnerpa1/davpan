"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/auth";
import { buildMemberImportSourceHash } from "@/lib/member-import";
import {
  type ImportRow,
  normalizeMemberImportRow,
  parseMemberImportCsv,
} from "@/lib/member-import-csv";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

async function requireMemberImportAdmin() {
  const supabase = await createClient();
  const { user, role } = await getCurrentUserProfile();

  if (!user) return { supabase, error: "Nicht eingeloggt." };

  if (!isAdminRole(role)) {
    return { supabase, error: "Keine Berechtigung (nur Admin)." };
  }

  return { supabase, error: null };
}

type NormalizedImportRow = {
  membership_number: string;
  family_number: string | null;
  household_number: string | null;
  salutation: string | null;
  first_name: string;
  last_name: string;
  birthdate: string;
  email: string | null;
  phone_mobile: string | null;
  zip_city: string | null;
  iban: string | null;
  bank_name: string | null;
  membership_category_code: string;
  section_number: string | null;
  stammsektion: string | null;
  gastsektion: string | null;
  is_active: boolean;
  source_row_hash: string;
};

type SectionMemberRow = {
  membership_number: string;
  family_number: string | null;
  household_number: string | null;
  salutation: string | null;
  first_name: string;
  last_name: string;
  birthdate: string;
  email: string | null;
  phone_mobile: string | null;
  zip_city: string | null;
  iban_masked: string | null;
  bank_name: string | null;
  membership_category_code: string;
  membership_category: string;
  section_number: string | null;
  stammsektion: string | null;
  gastsektion: string | null;
  is_active: boolean;
};

type PreviewDiffField = {
  label: string;
  currentValue: string;
  incomingValue: string;
  changed: boolean;
};

type PreviewRow = {
  membership_number: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  family_number: string;
  category_code: string;
  status: "new" | "update" | "unchanged";
  changeCount: number;
  diffs: PreviewDiffField[];
};

function normalizeImportRow(row: ImportRow): NormalizedImportRow {
  return {
    ...normalizeMemberImportRow(row),
    source_row_hash: buildMemberImportSourceHash(row),
  };
}

function formatValue(value: string | null | boolean) {
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  return value ?? "-";
}

function compareField(
  label: string,
  currentValue: string | null | boolean,
  incomingValue: string | null | boolean,
): PreviewDiffField {
  const current = formatValue(currentValue);
  const incoming = formatValue(incomingValue);

  return {
    label,
    currentValue: current,
    incomingValue: incoming,
    changed: current !== incoming,
  };
}

function buildPreviewRow(
  importedRow: NormalizedImportRow,
  currentRow: SectionMemberRow | null,
): PreviewRow {
  const diffs = [
    compareField(
      "Vorname",
      currentRow?.first_name ?? null,
      importedRow.first_name,
    ),
    compareField(
      "Nachname",
      currentRow?.last_name ?? null,
      importedRow.last_name,
    ),
    compareField(
      "Geburtsdatum",
      currentRow?.birthdate ?? null,
      importedRow.birthdate,
    ),
    compareField(
      "Familiennummer",
      currentRow?.family_number ?? null,
      importedRow.family_number,
    ),
    compareField(
      "Haushaltsnr.",
      currentRow?.household_number ?? null,
      importedRow.household_number,
    ),
    compareField(
      "Anrede",
      currentRow?.salutation ?? null,
      importedRow.salutation,
    ),
    compareField("E-Mail", currentRow?.email ?? null, importedRow.email),
    compareField(
      "Mobil",
      currentRow?.phone_mobile ?? null,
      importedRow.phone_mobile,
    ),
    compareField("PLZ/Ort", currentRow?.zip_city ?? null, importedRow.zip_city),
    compareField("IBAN", currentRow?.iban_masked ?? null, importedRow.iban),
    compareField(
      "Bankname",
      currentRow?.bank_name ?? null,
      importedRow.bank_name,
    ),
    compareField(
      "Kategorie",
      currentRow?.membership_category_code ?? null,
      importedRow.membership_category_code,
    ),
    compareField(
      "Sektionsnr.",
      currentRow?.section_number ?? null,
      importedRow.section_number,
    ),
    compareField(
      "Stammsektion",
      currentRow?.stammsektion ?? null,
      importedRow.stammsektion,
    ),
    compareField(
      "Gastsektion",
      currentRow?.gastsektion ?? null,
      importedRow.gastsektion,
    ),
    compareField("Aktiv", currentRow?.is_active ?? null, importedRow.is_active),
  ];

  const changeCount = diffs.filter((diff) => diff.changed).length;

  return {
    membership_number: importedRow.membership_number,
    first_name: importedRow.first_name,
    last_name: importedRow.last_name,
    birthdate: importedRow.birthdate,
    family_number: importedRow.family_number ?? "",
    category_code: importedRow.membership_category_code,
    status: currentRow ? (changeCount > 0 ? "update" : "unchanged") : "new",
    changeCount,
    diffs,
  };
}

export async function previewMemberImport(
  fileContent: string,
  fileType: string,
) {
  const { supabase, error: authorizationError } =
    await requireMemberImportAdmin();
  if (authorizationError) {
    return {
      success: false,
      error: authorizationError,
      totalRows: 0,
      previewRows: [],
    };
  }

  const rows =
    fileType === "csv"
      ? parseMemberImportCsv(fileContent)
      : JSON.parse(fileContent);

  if (!Array.isArray(rows)) {
    throw new Error("Die Importdatei muss ein Array oder CSV sein.");
  }

  const importedRows = rows.slice(0, 25).map((row) => normalizeImportRow(row));
  const membershipNumbers = importedRows.reduce<string[]>((values, row) => {
    if (row.membership_number) {
      values.push(row.membership_number);
    }
    return values;
  }, []);

  const { data: existingRows } = membershipNumbers.length
    ? await supabase
        .from("section_members")
        .select(
          "membership_number, family_number, household_number, salutation, first_name, last_name, birthdate, email, phone_mobile, zip_city, iban_masked, bank_name, membership_category_code, membership_category, section_number, stammsektion, gastsektion, is_active",
        )
        .in("membership_number", membershipNumbers)
    : { data: [] };

  const existingByMembershipNumber = new Map<string, SectionMemberRow>();
  for (const existingRow of (existingRows ?? []) as SectionMemberRow[]) {
    existingByMembershipNumber.set(existingRow.membership_number, existingRow);
  }

  const previewRows = importedRows.map((row) =>
    buildPreviewRow(
      row,
      existingByMembershipNumber.get(row.membership_number) ?? null,
    ),
  );

  return {
    success: true,
    totalRows: rows.length,
    previewRows,
  };
}

export async function runMemberImport(fileContent: string, fileType: string) {
  const { error: authorizationError } = await requireMemberImportAdmin();
  if (authorizationError) return { success: false, error: authorizationError };

  const rows =
    fileType === "csv"
      ? parseMemberImportCsv(fileContent)
      : JSON.parse(fileContent);

  if (!Array.isArray(rows)) {
    return { success: false, error: "Ungültiges Importformat." };
  }

  const { createClient: createAdminClient } = await import(
    "@supabase/supabase-js"
  );
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: "Serverkonfiguration unvollständig." };
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const normalizedRows = (rows as ImportRow[]).map(normalizeImportRow);
  for (const normalizedRow of normalizedRows) {
    const {
      membership_number: membershipNumber,
      first_name: firstName,
      last_name: lastName,
      birthdate,
    } = normalizedRow;

    if (!membershipNumber || !firstName || !lastName || !birthdate) {
      return {
        success: false,
        error: `Ungültige Importzeile für ${membershipNumber || "unbekannte Mitgliedsnummer"}.`,
      };
    }
  }

  const { error } = await adminClient.rpc("import_section_member_rows", {
    p_rows: normalizedRows,
  });
  if (error)
    return { success: false, error: `Import fehlgeschlagen: ${error.message}` };

  revalidatePath("/admin/members/import");
  revalidatePath("/admin");
  revalidatePath("/profile");

  return { success: true, importedRows: rows.length };
}
