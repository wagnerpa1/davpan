import { createHash } from "node:crypto";

export function buildIdempotencyKey(
  scope: string,
  parts: Array<string | number | null | undefined>,
): string {
  const normalized = parts.map((part) => String(part ?? "")).join("|");
  return `${scope}:${createHash("sha256").update(normalized).digest("hex")}`;
}

