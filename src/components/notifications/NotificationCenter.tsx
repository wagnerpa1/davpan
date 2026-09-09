"use client";

import { Bell } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { NotificationItem } from "./NotificationItemRow";
import { NotificationItemRow } from "./NotificationItemRow";
import type { NotificationTab } from "./NotificationTabsHeader";
import { NotificationTabsHeader } from "./NotificationTabsHeader";

interface NotificationCenterResponse {
  tabs: NotificationTab[];
}

interface NotificationCenterProps {
  isParent: boolean;
}

function formatRelative(dateIso: string): string {
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

function sanitizeClientPath(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("/")) {
    return path;
  }

  return null;
}

export function NotificationCenter({ isParent }: NotificationCenterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<NotificationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("self");
  const [isMarkingTabAsRead, setIsMarkingTabAsRead] = useState(false);

  const totalUnread = tabs.reduce((sum, tab) => sum + tab.unreadCount, 0);

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  const hasTabNavigation = isParent && tabs.length > 1;

  const realtimeFilters = tabs.reduce<string[]>((acc, tab) => {
    const filter =
      tab.targetType === "self"
        ? `recipient_user_id=eq.${tab.targetId}`
        : `recipient_child_id=eq.${tab.targetId}`;
    if (filter) acc.push(filter);
    return acc;
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/center", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        console.error(
          "Notification center load failed with status:",
          response.status,
        );
        setError("Benachrichtigungen konnten nicht geladen werden.");
        return;
      }

      const data = (await response.json()) as NotificationCenterResponse;
      setTabs(data.tabs);

      if (data.tabs.length === 0) {
        setActiveTabId("self");
      } else {
        setActiveTabId((currentId) =>
          data.tabs.some((tab) => tab.id === currentId)
            ? currentId
            : data.tabs[0].id,
        );
      }
    } catch (err) {
      console.error("Notification center load failed:", err);
      setError("Benachrichtigungen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleNotificationsRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      void loadNotifications();
    }, 180);
  }, [loadNotifications]);

  const markSingleAsReadLocally = useCallback((notificationId: string) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => {
        let changed = false;

        const nextItems = tab.items.map((item) => {
          if (item.id !== notificationId || item.read_at) {
            return item;
          }

          changed = true;
          return { ...item, read_at: new Date().toISOString() };
        });

        if (!changed) {
          return tab;
        }

        return {
          ...tab,
          unreadCount: Math.max(0, tab.unreadCount - 1),
          items: nextItems,
        };
      }),
    );
  }, []);

  const markSingleAsRead = useCallback(
    async (notificationId: string) => {
      markSingleAsReadLocally(notificationId);

      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          scope: "single",
          notificationId,
        }),
      });

      if (!response.ok) {
        scheduleNotificationsRefresh();
      }
    },
    [markSingleAsReadLocally, scheduleNotificationsRefresh],
  );

  const openNotification = useCallback(
    async (item: NotificationItem) => {
      if (!item.read_at) {
        await markSingleAsRead(item.id);
      }

      const url = sanitizeClientPath(item.payload?.url);
      if (url) {
        window.location.href = url;
      }
    },
    [markSingleAsRead],
  );

  const markActiveTabAsRead = useCallback(async () => {
    if (!activeTab || isMarkingTabAsRead) {
      return;
    }

    setIsMarkingTabAsRead(true);

    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          scope: "all",
          targetType: activeTab.targetType,
          targetId: activeTab.targetId,
        }),
      });

      if (!response.ok) {
        return;
      }

      setTabs((currentTabs) =>
        currentTabs.map((tab) => {
          if (tab.id !== activeTab.id) {
            return tab;
          }

          return {
            ...tab,
            unreadCount: 0,
            items: tab.items.map((item) =>
              item.read_at
                ? item
                : { ...item, read_at: new Date().toISOString() },
            ),
          };
        }),
      );
    } finally {
      setIsMarkingTabAsRead(false);
    }
  }, [activeTab, isMarkingTabAsRead]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) {
        return;
      }

      const targetNode = event.target as Node | null;
      if (targetNode && !rootRef.current.contains(targetNode)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || realtimeFilters.length === 0) {
      return () => {};
    }

    const channel = supabase.channel("notification-center");

    for (const filter of realtimeFilters) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter,
        },
        () => {
          scheduleNotificationsRefresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isOpen, realtimeFilters, scheduleNotificationsRefresh, supabase]);

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
        <div className="fixed inset-x-0 bottom-0 top-14 z-60 sm:top-16">
          <button
            type="button"
            aria-label="Benachrichtigungen schließen"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px]"
          />

          <div className="absolute inset-0 flex items-start justify-center px-4 pb-6 pt-4 md:justify-end md:px-6 md:pt-4">
            <div className="relative flex max-h-[calc(100vh-8rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <NotificationTabsHeader
                tabs={tabs}
                activeTabId={activeTabId}
                hasTabNavigation={hasTabNavigation}
                isMarkingTabAsRead={isMarkingTabAsRead}
                onSelectTab={setActiveTabId}
                onMarkTabAsRead={() => void markActiveTabAsRead()}
              />

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {isLoading && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Lade...
                  </p>
                )}

                {!isLoading && error && (
                  <p className="py-8 text-center text-sm text-red-600">
                    {error}
                  </p>
                )}

                {!isLoading &&
                  !error &&
                  activeTab &&
                  activeTab.items.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Keine Benachrichtigungen.
                    </p>
                  )}

                {!isLoading &&
                  !error &&
                  activeTab &&
                  activeTab.items.length > 0 && (
                    <ul className="space-y-2">
                      {activeTab.items.map((item) => (
                        <NotificationItemRow
                          key={item.id}
                          item={item}
                          formatRelative={formatRelative}
                          sanitizeClientPath={sanitizeClientPath}
                          onOpenNotification={openNotification}
                          onMarkSingleAsRead={markSingleAsRead}
                        />
                      ))}
                    </ul>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
