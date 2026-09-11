import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function parseJsonRows(input) {
  const parsed = JSON.parse(input);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON input must be an array of member rows.");
  }

  return parsed;
}

function splitCsvLine(line) {
  const cells = [];
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

function parseCsvRows(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function normalizeRow(row) {
  return {
    membership_number:
      row.membership_number ??
      row.MitglNr ??
      row["Mitgl.Nr."] ??
      row["Mitgl.Nr"] ??
      "",
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
      row.Kategorie1 ??
      row["Kategorie 1"] ??
      "",
    membership_category: row.membership_category ?? null,
    section_number: row.section_number ?? row.Sektionsnr ?? null,
    stammsektion: row.stammsektion ?? row.Stammsektion ?? null,
    gastsektion: row.gastsektion ?? row.Gastsektion ?? null,
    is_active:
      String(row.is_active ?? row.AktivPassiv ?? "true").toLowerCase() !==
      "false",
    source_row_hash: row.source_row_hash ?? row.SourceRowHash ?? "",
  };
}

function buildCategoryCode(row) {
  const normalized = normalizeRow(row);
  return normalized.membership_category_code.toString().trim();
}

async function main() {
  const inputPath = process.argv[2];
  const format = (
    process.argv[3] ??
    path.extname(inputPath ?? "").slice(1) ??
    "json"
  ).toLowerCase();

  if (!inputPath) {
    throw new Error(
      "Usage: node scripts/import-section-members.mjs <input-file> [json|csv]",
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin configuration.");
  }

  const rawInput = await fs.readFile(inputPath, "utf8");
  const rows =
    format === "csv" ? parseCsvRows(rawInput) : parseJsonRows(rawInput);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  for (const row of rows) {
    const normalized = normalizeRow(row);
    const membershipCategoryCode = buildCategoryCode(row);

    if (
      !normalized.membership_number ||
      !normalized.first_name ||
      !normalized.last_name ||
      !normalized.birthdate ||
      !membershipCategoryCode ||
      !normalized.source_row_hash
    ) {
      throw new Error(`Invalid member row: ${JSON.stringify(row)}`);
    }

    const { error } = await supabase.rpc("import_section_member_row", {
      p_membership_number: normalized.membership_number,
      p_family_number: normalized.family_number,
      p_household_number: normalized.household_number,
      p_salutation: normalized.salutation,
      p_first_name: normalized.first_name,
      p_last_name: normalized.last_name,
      p_birthdate: normalized.birthdate,
      p_email: normalized.email,
      p_phone_mobile: normalized.phone_mobile,
      p_zip_city: normalized.zip_city,
      p_iban: normalized.iban,
      p_bank_name: normalized.bank_name,
      p_membership_category_code: membershipCategoryCode,
      p_section_number: normalized.section_number,
      p_stammsektion: normalized.stammsektion,
      p_gastsektion: normalized.gastsektion,
      p_is_active: normalized.is_active,
      p_source_row_hash: normalized.source_row_hash,
    });

    if (error) {
      throw new Error(
        `Import failed for ${normalized.membership_number}: ${error.message}`,
      );
    }
  }

  console.log(`Imported ${rows.length} member rows.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
