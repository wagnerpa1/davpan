"use client";

import type { NotificationItem } from "./NotificationItemRow";
import { NotificationItemRow } from "./NotificationItemRow";
import type { NotificationTab } from "./NotificationTabsHeader";
import { NotificationTabsHeader } from "./NotificationTabsHeader";
import {
  formatRelative,
  sanitizeClientPath,
} from "./notification-center-helpers";

interface NotificationPanelProps {
  tabs: NotificationTab[];
  activeTabId: string;
  activeTab: NotificationTab | null;
  hasTabNavigation: boolean;
  isLoading: boolean;
  error: string | null;
  isMarkingTabAsRead: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
  onMarkTabAsRead: () => void;
  onOpenNotification: (item: NotificationItem) => void | Promise<void>;
  onMarkSingleAsRead: (notificationId: string) => void;
}

export function NotificationPanel({
  tabs,
  activeTabId,
  activeTab,
  hasTabNavigation,
  isLoading,
  error,
  isMarkingTabAsRead,
  onClose,
  onSelectTab,
  onMarkTabAsRead,
  onOpenNotification,
  onMarkSingleAsRead,
}: NotificationPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-60 sm:top-16">
      <button
        type="button"
        aria-label="Benachrichtigungen schließen"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px]"
      />

      <div className="absolute inset-0 flex items-start justify-center px-4 pb-6 pt-4 md:justify-end md:px-6 md:pt-4">
        <div className="relative flex max-h-[calc(100vh-8rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <NotificationTabsHeader
            tabs={tabs}
            activeTabId={activeTabId}
            hasTabNavigation={hasTabNavigation}
            isMarkingTabAsRead={isMarkingTabAsRead}
            onSelectTab={onSelectTab}
            onMarkTabAsRead={onMarkTabAsRead}
          />

          <NotificationPanelBody
            isLoading={isLoading}
            error={error}
            activeTab={activeTab}
            onOpenNotification={onOpenNotification}
            onMarkSingleAsRead={onMarkSingleAsRead}
          />
        </div>
      </div>
    </div>
  );
}

interface NotificationPanelBodyProps {
  isLoading: boolean;
  error: string | null;
  activeTab: NotificationTab | null;
  onOpenNotification: (item: NotificationItem) => void | Promise<void>;
  onMarkSingleAsRead: (notificationId: string) => void;
}

function NotificationPanelBody({
  isLoading,
  error,
  activeTab,
  onOpenNotification,
  onMarkSingleAsRead,
}: NotificationPanelBodyProps) {
  if (isLoading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="py-8 text-center text-sm text-slate-500">Lade...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="py-8 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!activeTab || activeTab.items.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="py-8 text-center text-sm text-slate-500">
          Keine Benachrichtigungen.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <ul className="space-y-2">
        {activeTab.items.map((item) => (
          <NotificationItemRow
            key={item.id}
            item={item}
            formatRelative={formatRelative}
            sanitizeClientPath={sanitizeClientPath}
            onOpenNotification={onOpenNotification}
            onMarkSingleAsRead={onMarkSingleAsRead}
          />
        ))}
      </ul>
    </div>
  );
}
