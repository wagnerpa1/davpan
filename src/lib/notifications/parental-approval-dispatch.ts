import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchNotification } from "./dispatcher";

/**
 * Finds all parent user IDs linked to a youth user account.
 */
export async function findLinkedParentUserIds(
  supabase: SupabaseClient,
  youthUserId: string,
): Promise<string[]> {
  const { data: childRecords } = await supabase
    .from("child_profiles")
    .select("id, parent_id")
    .eq("user_id", youthUserId);

  if (!childRecords || childRecords.length === 0) {
    return [];
  }

  const parentIds = new Set<string>();
  const childIds: string[] = [];

  for (const child of childRecords) {
    if (child.parent_id) {
      parentIds.add(child.parent_id);
    }
    childIds.push(child.id);
  }

  if (childIds.length > 0) {
    const { data: relations } = await supabase
      .from("parent_child_relations")
      .select("parent_id")
      .in("child_id", childIds);

    for (const r of relations ?? []) {
      if (r.parent_id) {
        parentIds.add(r.parent_id);
      }
    }
  }

  return Array.from(parentIds);
}

/**
 * Dispatches a notification to all linked parents when a 16-17 youth account requires parental approval.
 */
export async function notifyParentOfYouthApprovalNeeded(
  supabase: SupabaseClient,
  youthUserId: string,
  actionContext?: string,
) {
  const parentIds = await findLinkedParentUserIds(supabase, youthUserId);
  if (parentIds.length === 0) return;

  const { data: youthProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", youthUserId)
    .maybeSingle();

  const youthName = youthProfile?.full_name || "Dein Kind";
  const body = actionContext
    ? `${youthName} (16–17 Jahre) möchte an "${actionContext}" teilnehmen. Bitte schalte das Jugendkonto in deinem Profil für Tourenanmeldungen frei.`
    : `${youthName} (16–17 Jahre) hat sich registriert und benötigt deine Freigabe für Tourenanmeldungen.`;

  await Promise.all(
    parentIds.map((parentId) =>
      dispatchNotification(supabase, {
        type: "system",
        title: "Elterliche Zustimmung erforderlich",
        body,
        recipientUserId: parentId,
        payload: {
          youth_user_id: youthUserId,
          action_context: actionContext,
        },
      }),
    ),
  );
}
