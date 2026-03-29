"use client";

import { Bell, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  payload: {
    url?: string;
  };
}

interface NotificationTab {
  id: string;
  label: string;
  targetType: "self" | "child";
  targetId: string;
  unreadCount: number;
  items: NotificationItem[];
}

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

  const totalUnread = useMemo(
    () => tabs.reduce((sum, tab) => sum + tab.unreadCount, 0),
    [tabs],
  );

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [tabs, activeTabId],
  );

  const hasTabNavigation = isParent && tabs.length > 1;

  const realtimeFilters = useMemo(
    () =>
      tabs
        .map((tab) =>
          tab.targetType === "self"
            ? `recipient_user_id=eq.${tab.targetId}`
            : `recipient_child_id=eq.${tab.targetId}`,
        )
        .filter(Boolean),
    [tabs],
  );

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
      } else if (!data.tabs.some((tab) => tab.id === activeTabId)) {
        setActiveTabId(data.tabs[0].id);
      }
    } catch (err) {
      console.error("Notification center load failed:", err);
      setError("Benachrichtigungen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTabId]);

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
    if (!activeTab) return;

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
  }, [activeTab]);

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
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || realtimeFilters.length === 0) {
      return;
    }

    const subscriptions = realtimeFilters.map((filter) =>
      supabase
        .channel(`notification-center-${filter}`)
        .on(
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
        )
        .subscribe(),
    );

    return () => {
      for (const channel of subscriptions) {
        void supabase.removeChannel(channel);
      }

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
        <div className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+4.25rem)] bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 flex items-center md:absolute md:inset-x-auto md:top-full md:bottom-auto md:mt-2 md:block">
          <div className="mx-auto flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:max-h-none md:w-[min(92vw,26rem)]">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Benachrichtigungen
                </h2>
                <button
                  type="button"
                  onClick={markActiveTabAsRead}
                  className="text-xs font-semibold text-jdav-green hover:underline"
                >
                  {hasTabNavigation
                    ? "Tab als gelesen markieren"
                    : "Alle gelesen"}
                </button>
              </div>

              {hasTabNavigation && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTabId(tab.id)}
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

            <div className="min-h-0 flex-1 overflow-y-auto p-3 md:max-h-[60vh]">
              {isLoading && (
                <p className="py-8 text-center text-sm text-slate-500">
                  Lade...
                </p>
              )}

              {!isLoading && error && (
                <p className="py-8 text-center text-sm text-red-600">{error}</p>
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
                      <li
                        key={item.id}
                        className={`rounded-xl border p-3 ${
                          item.read_at
                            ? "border-slate-100 bg-slate-50"
                            : "border-jdav-green/30 bg-green-50"
                        }`}
                      >
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => void openNotification(item)}
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
                          onClick={() => void openNotification(item)}
                        >
                          {item.body}
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          {!item.read_at ? (
                            <button
                              type="button"
                              onClick={() => void markSingleAsRead(item.id)}
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
                              onClick={() => void openNotification(item)}
                              className="text-[11px] font-semibold text-jdav-green hover:underline"
                            >
                              Zum Beitrag
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
