export type ConflictErrorCode =
  | "stale_write"
  | "conflict"
  | "capacity_exceeded"
  | "inventory_exceeded"
  | "invalid_state"
  | "unknown_error"
  | "unauthorized";

export class DomainError extends Error {
  constructor(
    public code: ConflictErrorCode,
    message: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Maps Postgres exceptions and custom RPC exceptions to standard DomainError.
 */
export function mapPostgresError(error: unknown): DomainError {
  if (!error || typeof error !== "object")
    return new DomainError("unknown_error", "Unknown error occurred");

  const err = error as Record<string, unknown>;
  const code = typeof err.code === "string" ? err.code : "";
  const message = typeof err.message === "string" ? err.message : "";

  // 08000 is used in our custom RPCs (material, resources)
  if (code === "08000") {
    if (message.includes("Insufficient inventory")) {
      return new DomainError("inventory_exceeded", message, false);
    }
    if (message.includes("Resource already booked")) {
      return new DomainError("conflict", message, false);
    }
  }

  // DB constraints
  if (code === "23505") {
    // unique violation
    return new DomainError("conflict", "Data already exists", false);
  }

  // Custom exceptions
  if (code === "P0001" || code === "P0002") {
    return new DomainError("invalid_state", message, false);
  }

  // Optimistic Concurrency Control (Version Mismatch)
  // Let's adopt 40001 serialization_failure for logical lock/stale write
  if (code === "40001" || message.includes("stale_write")) {
    return new DomainError(
      "stale_write",
      "The data has been modified by someone else recently.",
      true,
    );
  }

  return new DomainError("unknown_error", message, false);
}
