"use client";

import { useCallback, useEffect } from "react";

export function usePushNotifications() {
  const registerPushNotifications = useCallback(async () => {
    // Check browser support
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Push notifications not supported in this browser");
      return;
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (!existingSubscription) {
        // Kein Auto-Subscribe ohne User-Geste: nur vorhandene Abos mit Backend synchronisieren.
        return;
      }

      // Send subscription to backend
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "XMLHttpRequest",
          accept: "application/json",
        },
        body: JSON.stringify({
          subscription: existingSubscription.toJSON(),
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User ist nicht angemeldet; Auto-Sync in diesem Zustand still beenden.
          return;
        }

        if (response.status === 403) {
          console.warn("[Push] Subscription blocked by CSRF/origin policy");
          return;
        }

        let details: string;
        try {
          const data = (await response.json()) as {
            error?: string;
            code?: string;
          };
          details = data.code
            ? `${data.code}: ${data.error || ""}`
            : data.error || "";
        } catch {
          details = await response.text();
        }

        console.error(
          `[Push] Failed to save subscription to backend (${response.status})`,
          details,
        );
      } else {
        console.log("[Push] Subscription saved to backend");
      }
    } catch (error) {
      console.error("[Push] Error registering push notifications:", error);
    }
  }, []);

  // Run on mount
  useEffect(() => {
    registerPushNotifications();
  }, [registerPushNotifications]);
}
