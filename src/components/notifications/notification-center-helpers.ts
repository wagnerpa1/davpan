import type { SupabaseClient } from "@supabase/supabase-js";

export function formatRelative(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} h`;

  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function sanitizeClientPath(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("/")) {
    return path;
  }

  return null;
}

interface SubscribeToNotificationInsertsParams {
  supabase: SupabaseClient;
  filters: string[];
  onInsert: () => void;
}

/**
 * Subscribes to notification INSERT events and returns an unsubscribe handle
 * owned by the caller effect.
 */
export function subscribeToNotificationInserts({
  supabase,
  filters,
  onInsert,
}: SubscribeToNotificationInsertsParams): () => void {
  const channel = supabase.channel("notification-center");

  for (const filter of filters) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter,
      },
      onInsert,
    );
  }

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
