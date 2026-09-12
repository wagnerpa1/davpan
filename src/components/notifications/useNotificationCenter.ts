"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { NotificationItem } from "./NotificationItemRow";
import type { NotificationTab } from "./NotificationTabsHeader";
import {
  sanitizeClientPath,
  subscribeToNotificationInserts,
} from "./notification-center-helpers";

interface NotificationCenterResponse {
  tabs: NotificationTab[];
}

export function useNotificationCenter(isParent: boolean) {
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

  const realtimeFilters = useMemo(
    () =>
      tabs.map((tab) =>
        tab.targetType === "self"
          ? `recipient_user_id=eq.${tab.targetId}`
          : `recipient_child_id=eq.${tab.targetId}`,
      ),
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
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || realtimeFilters.length === 0) {
      return;
    }

    return subscribeToNotificationInserts({
      supabase,
      filters: realtimeFilters,
      onInsert: scheduleNotificationsRefresh,
    });
  }, [isOpen, realtimeFilters, scheduleNotificationsRefresh, supabase]);

  return {
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
  };
}
