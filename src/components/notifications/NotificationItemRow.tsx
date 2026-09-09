import { Check } from "lucide-react";

export interface NotificationItemPayload {
  url?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  type?: string;
  category?: string;
  title: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  payload?: NotificationItemPayload;
}

interface NotificationItemRowProps {
  item: NotificationItem;
  formatRelative: (isoDateString: string) => string;
  sanitizeClientPath: (path: string | undefined) => string | null;
  onOpenNotification: (item: NotificationItem) => void | Promise<void>;
  onMarkSingleAsRead: (notificationId: string) => void;
}

export function NotificationItemRow({
  item,
  formatRelative,
  sanitizeClientPath,
  onOpenNotification,
  onMarkSingleAsRead,
}: NotificationItemRowProps) {
  return (
    <li
      className={`rounded-xl border p-3 ${
        item.read_at
          ? "border-slate-100 bg-slate-50"
          : "border-jdav-green/30 bg-green-50"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => void onOpenNotification(item)}
          className="min-w-0 text-left"
        >
          <h3 className="text-sm font-semibold text-slate-900 transition-colors hover:text-jdav-green">
            {item.title}
          </h3>
        </button>
        <span className="shrink-0 text-[10px] text-slate-500">
          {formatRelative(item.created_at)}
        </span>
      </div>

      <button
        type="button"
        className="cursor-pointer text-left text-xs leading-relaxed text-slate-600"
        onClick={() => void onOpenNotification(item)}
      >
        {item.body}
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        {!item.read_at ? (
          <button
            type="button"
            onClick={() => void onMarkSingleAsRead(item.id)}
            className="inline-flex items-center gap-1 rounded-full border border-jdav-green/30 bg-white px-2 py-1 text-[10px] font-semibold text-jdav-green hover:bg-jdav-green/5"
            aria-label="Als gelesen markieren"
          >
            <Check className="h-3 w-3" />
            Gelesen
          </button>
        ) : (
          <span />
        )}

        {sanitizeClientPath(item.payload?.url) && (
          <button
            type="button"
            onClick={() => void onOpenNotification(item)}
            className="text-[11px] font-semibold text-jdav-green hover:underline"
          >
            Zur Tour
          </button>
        )}
      </div>
    </li>
  );
}
