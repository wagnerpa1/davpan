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

function parseCsvRows(input) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

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

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      cells.push(current);
      current = "";
      cells.push(null);
      continue;
    }

    current += char;
  }

  cells.push(current);
  const rows = [];
  let row = [];
  for (const cell of cells) {
    if (cell === null) {
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      row.push(cell.trim());
    }
  }
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
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

  const normalizedRows = rows.map((row) => {
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
    return { ...normalized, membership_category_code: membershipCategoryCode };
  });

  const { error } = await supabase.rpc("import_section_member_rows", {
    p_rows: normalizedRows,
  });
  if (error) throw new Error(`Import failed: ${error.message}`);

  console.log(`Imported ${rows.length} member rows.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
