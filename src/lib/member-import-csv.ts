export type ImportRow = Record<string, string>;

const SUPPORTED_DELIMITERS = [";", ",", "\t"];

function parseCsvRecord(input: string, delimiter: string): string[] {
  const cells: string[] = [];
  let value = "";
  let isQuoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (character === delimiter && !isQuoted) {
      cells.push(value.trim());
      value = "";
      continue;
    }

    value += character;
  }

  cells.push(value.trim());
  return cells;
}

function detectDelimiter(headerLine: string): string {
  return SUPPORTED_DELIMITERS.reduce((bestDelimiter, delimiter) =>
    parseCsvRecord(headerLine, delimiter).length >
    parseCsvRecord(headerLine, bestDelimiter).length
      ? delimiter
      : bestDelimiter,
  );
}

function hasContent(row: string[]): boolean {
  return row.some((value) => value.length > 0);
}

/** Parses quoted CSV records with comma, semicolon, or tab separators. */
export function parseMemberImportCsv(input: string): ImportRow[] {
  const normalizedInput = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const records: string[] = [];
  let record = "";
  let isQuoted = false;

  for (let index = 0; index < normalizedInput.length; index += 1) {
    const character = normalizedInput[index];
    const nextCharacter = normalizedInput[index + 1];

    if (character === '"' && isQuoted && nextCharacter === '"') {
      record += '""';
      index += 1;
      continue;
    }

    if (character === '"') {
      isQuoted = !isQuoted;
    }

    if (character === "\n" && !isQuoted) {
      records.push(record);
      record = "";
      continue;
    }

    record += character;
  }

  if (record.length > 0) {
    records.push(record);
  }

  const headerRecord = records.shift();
  if (!headerRecord) {
    return [];
  }

  const delimiter = detectDelimiter(headerRecord);
  const headers = parseCsvRecord(headerRecord, delimiter);

  return records.reduce<ImportRow[]>((rows, record) => {
    const values = parseCsvRecord(record, delimiter);
    if (!hasContent(values)) {
      return rows;
    }

    const row = headers.reduce<ImportRow>((result, header, index) => {
      if (header) {
        result[header] = values[index] ?? "";
      }
      return result;
    }, {});

    rows.push(row);
    return rows;
  }, []);
}

function getFirstValue(row: ImportRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeGermanDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const germanDate = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  if (!germanDate) {
    return value;
  }

  const [, day, month, year] = germanDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeActiveStatus(value: string | null): boolean {
  return !["false", "0", "passiv", "inactive", "inaktiv"].includes(
    value?.trim().toLowerCase() ?? "true",
  );
}

export function normalizeMemberImportRow(row: ImportRow) {
  return {
    membership_number:
      getFirstValue(row, [
        "membership_number",
        "MitglNr",
        "Mitgl.Nr.",
        "Mitgl.Nr",
      ]) ?? "",
    family_number: getFirstValue(row, ["family_number", "Familiennummer"]),
    household_number: getFirstValue(row, [
      "household_number",
      "Haushaltsnr",
      "Haushaltsnr.",
    ]),
    salutation: getFirstValue(row, ["salutation", "Anrede"]),
    first_name: getFirstValue(row, ["first_name", "Vorname"]) ?? "",
    last_name: getFirstValue(row, ["last_name", "Nachname"]) ?? "",
    birthdate: normalizeGermanDate(
      getFirstValue(row, ["birthdate", "Geburtsdatum"]),
    ),
    email: getFirstValue(row, ["email", "E-Mail"]),
    phone_mobile: getFirstValue(row, ["phone_mobile", "Mobil"]),
    zip_city: getFirstValue(row, ["zip_city", "PLZ/Ort"]),
    iban: getFirstValue(row, ["iban", "IBAN"]),
    bank_name: getFirstValue(row, ["bank_name", "Bankname"]),
    membership_category_code:
      getFirstValue(row, [
        "membership_category_code",
        "Kategorie 1",
        "Kategorie1",
      ]) ?? "",
    section_number: getFirstValue(row, [
      "section_number",
      "Sektionsnr",
      "Sektionsnr.",
    ]),
    stammsektion: getFirstValue(row, ["stammsektion", "Stammsektion"]),
    gastsektion: getFirstValue(row, ["gastsektion", "Gastsektion"]),
    is_active: normalizeActiveStatus(
      getFirstValue(row, ["is_active", "AktivPassiv", "Aktiv-Passiv"]),
    ),
  };
}
