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

      // Get public VAPID key
      const publicKeyResponse = await fetch("/api/notifications/vapid-public-key");
      if (!publicKeyResponse.ok) {
        console.error("[Push] Failed to fetch VAPID public key");
        return;
      }

      const { publicKey } = (await publicKeyResponse.json()) as { publicKey: string };

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log("[Push] Already subscribed to push notifications");
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      console.log("[Push] Successfully subscribed to push notifications");

      // Send subscription to backend
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: btoa(
            String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("p256dh") || [])))
          ),
          auth: btoa(
            String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("auth") || [])))
          ),
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

