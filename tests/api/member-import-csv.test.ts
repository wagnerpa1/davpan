import { describe, expect, it } from "vitest";
import {
  normalizeMemberImportRow,
  parseMemberImportCsv,
} from "@/lib/member-import-csv";

describe("member import CSV", () => {
  it("parses Mitgl.db semicolon exports and normalizes their fields", () => {
    const rows = parseMemberImportCsv(
      "\uFEFFMitgl.Nr.;Haushaltsnr.;Anrede;Nachname;Vorname;Geburtsdatum;Sektionsnr.;Aktiv-Passiv\n001000;50001;Herr;Mustermann;Max;15.05.1985;228;Aktiv\n001001;50001;Frau;Musterfrau;Erika;22.08.1988;228;Passiv",
    );

    expect(rows).toHaveLength(2);
    expect(normalizeMemberImportRow(rows[0])).toMatchObject({
      membership_number: "001000",
      household_number: "50001",
      first_name: "Max",
      last_name: "Mustermann",
      birthdate: "1985-05-15",
      section_number: "228",
      is_active: true,
    });
    expect(normalizeMemberImportRow(rows[1]).is_active).toBe(false);
  });

  it("supports quoted fields, embedded newlines, and comma-separated files", () => {
    const rows = parseMemberImportCsv(
      'membership_number,first_name,last_name,birthdate,zip_city\n001002,"Ada","Lovelace","2000-01-01","London,\nUK"',
    );

    expect(rows).toEqual([
      {
        membership_number: "001002",
        first_name: "Ada",
        last_name: "Lovelace",
        birthdate: "2000-01-01",
        zip_city: "London,\nUK",
      },
    ]);
  });
});
