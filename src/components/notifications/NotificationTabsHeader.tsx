import type { NotificationItem } from "./NotificationItemRow";

export interface NotificationTab {
  id: string;
  label: string;
  targetType?: "self" | "child";
  targetId?: string;
  unreadCount: number;
  items: NotificationItem[];
}

interface NotificationTabsHeaderProps {
  tabs: NotificationTab[];
  activeTabId: string;
  hasTabNavigation: boolean;
  isMarkingTabAsRead: boolean;
  onSelectTab: (tabId: string) => void;
  onMarkTabAsRead: () => void;
}

export function NotificationTabsHeader({
  tabs,
  activeTabId,
  hasTabNavigation,
  isMarkingTabAsRead,
  onSelectTab,
  onMarkTabAsRead,
}: NotificationTabsHeaderProps) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Benachrichtigungen</h2>
        <button
          type="button"
          onClick={() => void onMarkTabAsRead()}
          disabled={isMarkingTabAsRead}
          className="text-xs font-semibold text-jdav-green hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {hasTabNavigation ? "Tab als gelesen markieren" : "Alle gelesen"}
        </button>
      </div>

      {hasTabNavigation && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab.id === activeTabId
                  ? "bg-jdav-green text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
              {tab.unreadCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab.id === activeTabId
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
