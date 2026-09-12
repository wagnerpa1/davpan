"use client";

import { Bell } from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";
import { useNotificationCenter } from "./useNotificationCenter";

interface NotificationCenterProps {
  isParent: boolean;
}

export function NotificationCenter({ isParent }: NotificationCenterProps) {
  const {
    rootRef,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    tabs,
    activeTabId,
    setActiveTabId,
    isMarkingTabAsRead,
    totalUnread,
    activeTab,
    hasTabNavigation,
    openNotification,
    markSingleAsRead,
    markActiveTabAsRead,
  } = useNotificationCenter(isParent);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-jdav-green"
        aria-expanded={isOpen}
        aria-label="Benachrichtigungen öffnen"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-jdav-green px-1 text-[10px] font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          tabs={tabs}
          activeTabId={activeTabId}
          activeTab={activeTab}
          hasTabNavigation={hasTabNavigation}
          isLoading={isLoading}
          error={error}
          isMarkingTabAsRead={isMarkingTabAsRead}
          onClose={() => setIsOpen(false)}
          onSelectTab={setActiveTabId}
          onMarkTabAsRead={() => void markActiveTabAsRead()}
          onOpenNotification={openNotification}
          onMarkSingleAsRead={markSingleAsRead}
        />
      )}
    </div>
  );
}
