"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ImportRow = Record<string, string>;

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

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(input: string): ImportRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<ImportRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function normalizeImportRow(row: ImportRow): NormalizedImportRow {
  return {
    membership_number:
      row.membership_number ?? row["Mitgl.Nr."] ?? row["Mitgl.Nr"] ?? "",
    family_number: row.family_number ?? row.Familiennummer ?? null,
    household_number: row.household_number ?? row.Haushaltsnr ?? null,
    salutation: row.salutation ?? row.Anrede ?? null,
    first_name: row.first_name ?? row.Vorname ?? "",
    last_name: row.last_name ?? row.Nachname ?? "",
    birthdate: row.birthdate ?? row.Geburtsdatum ?? "",
    email: row.email ?? row["E-Mail"] ?? null,
    phone_mobile: row.phone_mobile ?? row.Mobil ?? null,
    zip_city: row.zip_city ?? row["PLZ/Ort"] ?? null,
    iban: row.iban ?? row.IBAN ?? null,
    bank_name: row.bank_name ?? row.Bankname ?? null,
    membership_category_code:
      row.membership_category_code ??
      row["Kategorie 1"] ??
      row.Kategorie1 ??
      "",
    section_number: row.section_number ?? row.Sektionsnr ?? null,
    stammsektion: row.stammsektion ?? row.Stammsektion ?? null,
    gastsektion: row.gastsektion ?? row.Gastsektion ?? null,
    is_active:
      String(row.is_active ?? row.AktivPassiv ?? "true").toLowerCase() !==
      "false",
    source_row_hash: row.source_row_hash ?? row.SourceRowHash ?? "",
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
  const rows =
    fileType === "csv" ? parseCsv(fileContent) : JSON.parse(fileContent);

  if (!Array.isArray(rows)) {
    throw new Error("Die Importdatei muss ein Array oder CSV sein.");
  }

  const importedRows = rows.slice(0, 25).map((row) => normalizeImportRow(row));
  const membershipNumbers = importedRows
    .map((row) => row.membership_number)
    .filter(Boolean);

  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData.user) {
    return { success: false, error: "Nicht eingeloggt." };
  }

  const rows =
    fileType === "csv" ? parseCsv(fileContent) : JSON.parse(fileContent);

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

  for (const row of rows as ImportRow[]) {
    const normalizedRow = normalizeImportRow(row);
    const membershipNumber = normalizedRow.membership_number;
    const firstName = normalizedRow.first_name;
    const lastName = normalizedRow.last_name;
    const birthdate = normalizedRow.birthdate;
    const sourceRowHash = normalizedRow.source_row_hash;

    if (
      !membershipNumber ||
      !firstName ||
      !lastName ||
      !birthdate ||
      !sourceRowHash
    ) {
      return {
        success: false,
        error: `Ungültige Importzeile für ${membershipNumber || "unbekannte Mitgliedsnummer"}.`,
      };
    }

    const { error } = await adminClient.rpc("import_section_member_row", {
      p_membership_number: membershipNumber,
      p_family_number: normalizedRow.family_number,
      p_household_number: normalizedRow.household_number,
      p_salutation: normalizedRow.salutation,
      p_first_name: firstName,
      p_last_name: lastName,
      p_birthdate: birthdate,
      p_email: normalizedRow.email,
      p_phone_mobile: normalizedRow.phone_mobile,
      p_zip_city: normalizedRow.zip_city,
      p_iban: normalizedRow.iban,
      p_bank_name: normalizedRow.bank_name,
      p_membership_category_code: normalizedRow.membership_category_code,
      p_section_number: normalizedRow.section_number,
      p_stammsektion: normalizedRow.stammsektion,
      p_gastsektion: normalizedRow.gastsektion,
      p_is_active: normalizedRow.is_active,
      p_source_row_hash: sourceRowHash,
    });

    if (error) {
      return {
        success: false,
        error: `Import fehlgeschlagen für ${membershipNumber}: ${error.message}`,
      };
    }
  }

  revalidatePath("/admin/members/import");
  revalidatePath("/admin");
  revalidatePath("/profile");

  return { success: true, importedRows: rows.length };
}
