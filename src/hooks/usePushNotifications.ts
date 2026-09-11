"use client";

import { useEffect } from "react";
import { syncPushSubscriptionToBackend } from "@/lib/notifications/push-client";

/**
 * Hook to automatically synchronize an existing push notification subscription with the backend.
 * This runs once on mount. It only synchronizes if a subscription already exists,
 * preventing unexpected permission prompts for the user.
 */
export function usePushNotifications() {
  useEffect(() => {
    const controller = new AbortController();

    const registerPushNotifications = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (controller.signal.aborted) {
          return;
        }

        const existingSubscription =
          await registration.pushManager.getSubscription();

        if (!existingSubscription || controller.signal.aborted) {
          // Kein Auto-Subscribe ohne User-Geste: nur vorhandene Abos mit Backend synchronisieren.
          return;
        }

        await syncPushSubscriptionToBackend(
          existingSubscription.toJSON(),
          controller.signal,
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[Push] Error registering push notifications:", error);
        }
      }
    };

    void registerPushNotifications();

    return () => {
      controller.abort();
    };
  }, []);
}
