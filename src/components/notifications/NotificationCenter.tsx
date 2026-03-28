"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
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

export function NotificationCenter({ isParent }: NotificationCenterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
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
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  );

  const hasTabNavigation = tabs.length > 1;

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications/center", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Konnte Benachrichtigungen nicht laden.");
      }

      const data = (await response.json()) as NotificationCenterResponse;
      setTabs(data.tabs);

      if (!data.tabs.find((tab) => tab.id === activeTabId)) {
        setActiveTabId(data.tabs[0]?.id ?? "self");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unbekannter Fehler beim Laden.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTabId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel("notification-center-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, supabase]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) {
        return;
      }

      if (rootRef.current?.contains(targetNode)) {
        return;
      }

      setIsOpen(false);
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

  const markActiveTabAsRead = async () => {
    if (!activeTab) return;

    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        targetType: activeTab.targetType,
        targetId: activeTab.targetId,
      }),
    });

    if (!response.ok) {
      return;
    }

    setTabs((currentTabs) =>
      currentTabs.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

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
  };

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
        <div className="absolute right-0 top-12 z-50 w-[92vw] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Notification Center
              </h2>
              <button
                type="button"
                onClick={markActiveTabAsRead}
                className="text-xs font-semibold text-jdav-green hover:underline"
              >
                {hasTabNavigation
                  ? "Tab als gelesen markieren"
                  : "Als gelesen markieren"}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {isParent && hasTabNavigation
                ? "Zwischen dir und deinen Kindern wechseln"
                : "Deine letzten Benachrichtigungen"}
            </p>
          </div>

          {hasTabNavigation && (
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
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

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {isLoading && (
              <p className="py-8 text-center text-sm text-slate-500">Lade...</p>
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
                        <h3 className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {formatRelative(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
