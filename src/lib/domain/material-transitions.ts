export type MaterialReservationStatus =
  | "requested"
  | "reserved"
  | "on loan"
  | "returned"
  | "cancelled";

export const MATERIAL_RESERVATION_STATUSES: readonly MaterialReservationStatus[] =
  ["requested", "reserved", "on loan", "returned", "cancelled"] as const;

export const ALLOWED_MATERIAL_TRANSITIONS: Record<
  MaterialReservationStatus,
  readonly MaterialReservationStatus[]
> = {
  requested: ["reserved", "cancelled"],
  reserved: ["on loan", "cancelled"],
  "on loan": ["returned", "cancelled"],
  returned: [],
  cancelled: [],
};

export function isAllowedMaterialTransition(
  currentStatus: MaterialReservationStatus,
  newStatus: MaterialReservationStatus,
): boolean {
  const allowed = ALLOWED_MATERIAL_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}
