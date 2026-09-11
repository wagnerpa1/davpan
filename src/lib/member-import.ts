import { createHash } from "node:crypto";

export function buildMemberImportSourceHash(row: Record<string, unknown>) {
  const explicitHash =
    typeof row.source_row_hash === "string"
      ? row.source_row_hash.trim()
      : typeof row.SourceRowHash === "string"
        ? row.SourceRowHash.trim()
        : "";

  if (explicitHash) {
    return explicitHash;
  }

  const payload = Object.entries(row)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value ?? "")}`)
    .join("|");

  return createHash("sha256").update(payload).digest("hex");
}
