import { describe, expect, it } from "vitest";
import { buildMemberImportSourceHash } from "@/lib/member-import";

describe("buildMemberImportSourceHash", () => {
  it("creates a deterministic hash from row values when no explicit hash is present", () => {
    const row = {
      membership_number: "123456",
      first_name: "Ada",
      last_name: "Lovelace",
      birthdate: "2000-01-01",
      family_number: "F-001",
      "Kategorie 1": "1000",
    };

    const hash = buildMemberImportSourceHash(row);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe("");
  });

  it("uses an explicit source row hash when provided", () => {
    const row = {
      membership_number: "123456",
      first_name: "Ada",
      last_name: "Lovelace",
      source_row_hash: "custom-hash",
    };

    expect(buildMemberImportSourceHash(row)).toBe("custom-hash");
  });
});
