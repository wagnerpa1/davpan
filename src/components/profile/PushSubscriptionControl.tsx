"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

interface PushSubscriptionControlProps {
  className?: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushSubscriptionControl({
  className = "",
}: PushSubscriptionControlProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window;
      setIsSupported(supported);

      if (!supported) {
        return;
      }

      setPermission(Notification.permission);
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setIsSubscribed(Boolean(existing));
    };

    checkSupport();
  }, []);

  const enablePush = async () => {
    if (!isSupported) {
      return;
    }

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.error(
        "[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured in environment"
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        console.log("[Push] User denied notification permission");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log("[Push] Creating new subscription...");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      console.log("[Push] Sending subscription to server...");
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[Push] Server rejected subscription:", error);
        return;
      }

      console.log("[Push] Subscription registered successfully");
      setIsSubscribed(true);
    } catch (error) {
      console.error("[Push] Error enabling push:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disablePush = async () => {
    if (!isSupported) {
      return;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      console.log("[Push] Removing subscription from server...");
      await fetch("/api/push/subscription", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      await subscription.unsubscribe();
      console.log("[Push] Subscription disabled");
      setIsSubscribed(false);
    } catch (error) {
      console.error("[Push] Error disabling push:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 ${className}`}
      >
        Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
      </div>
    );
  }

  const canEnable = permission !== "denied";

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${className}`}
    >
      <p className="mb-2 text-xs font-semibold text-slate-700">
        Browser Push (dieses Geraet)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isLoading || isSubscribed || !canEnable}
          onClick={enablePush}
          className="inline-flex items-center gap-1 rounded-md bg-jdav-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-jdav-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bell className="h-3.5 w-3.5" />
          Push aktivieren
        </button>
        <button
          type="button"
          disabled={isLoading || !isSubscribed}
          onClick={disablePush}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BellOff className="h-3.5 w-3.5" />
          Push deaktivieren
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Status: {isSubscribed ? "aktiv" : "inaktiv"}
      </p>
    </div>
  );
}

