"use client";

import { useEffect } from "react";

/**
 * Hook to automatically synchronize an existing push notification subscription with the backend.
 * This runs once on mount. It only synchronizes if a subscription already exists,
 * preventing unexpected permission prompts for the user.
 */
export function usePushNotifications() {
  useEffect(() => {
    const registerPushNotifications = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;

        const existingSubscription =
          await registration.pushManager.getSubscription();

        if (!existingSubscription) {
          // Kein Auto-Subscribe ohne User-Geste: nur vorhandene Abos mit Backend synchronisieren.
          return;
        }

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
        }
      } catch (error) {
        console.error("[Push] Error registering push notifications:", error);
      }
    };

    void registerPushNotifications();
  }, []);
}
