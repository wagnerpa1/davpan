"use client";

import { useEffect, useCallback } from "react";

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
      const existingSubscription = await registration.pushManager.getSubscription();

      if (!existingSubscription) {
        // Kein Auto-Subscribe ohne User-Geste: nur vorhandene Abos mit Backend synchronisieren.
        return;
      }

      // Send subscription to backend
      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: existingSubscription.toJSON(),
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        console.error("[Push] Failed to save subscription to backend");
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

