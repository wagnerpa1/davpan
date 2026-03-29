import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

export const SYSTEM_TARGET_MODES = ["all", "roles", "tour_groups"] as const;
export type SystemTargetMode = (typeof SYSTEM_TARGET_MODES)[number];

export const SYSTEM_TARGET_ROLES = [
  "member",
  "parent",
  "guide",
  "materialwart",
  "admin",
] as const;
export type SystemTargetRole = (typeof SYSTEM_TARGET_ROLES)[number];

export interface ResolvedNotificationTargets {
  userIds: string[];
  childIds: string[];
}

export async function resolveAdminSystemTargets(
  supabase: SupabaseClient<Database>,
  mode: SystemTargetMode,
  roles: SystemTargetRole[],
  groupIds: string[],
): Promise<ResolvedNotificationTargets> {
  const userIds = new Set<string>();
  const childIds = new Set<string>();

  if (mode === "all") {
    const [{ data: usersData }, { data: childrenData }] = await Promise.all([
      supabase.from("profiles").select("id"),
      supabase.from("child_profiles").select("id"),
    ]);

    for (const row of (usersData ?? []) as { id: string }[]) {
      userIds.add(row.id);
    }

    for (const row of (childrenData ?? []) as { id: string }[]) {
      childIds.add(row.id);
    }

    return {
      userIds: [...userIds],
      childIds: [...childIds],
    };
  }

  if (mode === "roles") {
    if (roles.length === 0) {
      return { userIds: [], childIds: [] };
    }

    const { data: roleUsersData } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles);

    for (const row of (roleUsersData ?? []) as { id: string }[]) {
      userIds.add(row.id);
    }

    return {
      userIds: [...userIds],
      childIds: [],
    };
  }

  if (groupIds.length === 0) {
    return { userIds: [], childIds: [] };
  }

  const [{ data: userPreferenceRows }, { data: childPreferenceRows }] =
    await Promise.all([
      supabase
        .from("notification_preferences")
        .select("user_id")
        .overlaps("tour_group_ids", groupIds),
      supabase
        .from("child_notification_preferences")
        .select("child_id")
        .overlaps("tour_group_ids", groupIds),
    ]);

  for (const row of (userPreferenceRows ?? []) as { user_id: string }[]) {
    userIds.add(row.user_id);
  }

  for (const row of (childPreferenceRows ?? []) as { child_id: string }[]) {
    childIds.add(row.child_id);
  }

  return {
    userIds: [...userIds],
    childIds: [...childIds],
  };
}
