export interface ParsedMaterialRequest {
  material_type_id: string;
  size: string;
}

export function parseMaterialsData(
  materialsDataRaw: unknown,
): ParsedMaterialRequest[] {
  if (typeof materialsDataRaw !== "string" || !materialsDataRaw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(materialsDataRaw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ParsedMaterialRequest =>
        Boolean(item) &&
        typeof item.material_type_id === "string" &&
        typeof item.size === "string",
    );
  } catch {
    return [];
  }
}

export function calculateParticipantAgeOnDate(
  birthdate: string,
  targetDate: string,
): number {
  const bDate = new Date(birthdate);
  const sDate = new Date(targetDate);
  let age = sDate.getFullYear() - bDate.getFullYear();
  const m = sDate.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && sDate.getDate() < bDate.getDate())) {
    age--;
  }
  return age;
}

export function isUnderMinAgeRequirement(
  birthdate: string | null | undefined,
  startDate: string | null | undefined,
  minAge: number | null | undefined,
): boolean {
  if (!birthdate || !startDate || !minAge) return false;
  return calculateParticipantAgeOnDate(birthdate, startDate) < minAge;
}
