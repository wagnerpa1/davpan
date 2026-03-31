/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  BackgroundSyncPlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const bgSyncPlugin = new BackgroundSyncPlugin("offline-mutations-queue", {
  maxRetentionTime: 24 * 60, // Retry for max 24 Hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        const response = await fetch(entry.request.clone());
        
        if (response.ok) {
          const clone = response.clone();
          const text = await clone.text();
          
          if (text.includes('"success":false') && text.includes('"error"')) {
            let conflictType = "Konflikt";
            if (text.includes('stale_write')) conflictType = "Daten veraltet";
            else if (text.includes('Material') || text.includes('inventory_exceeded')) conflictType = "Material nicht mehr verfuegbar";
            else if (text.includes('ausgebucht') || text.includes('capacity_exceeded')) conflictType = "Kein freier Platz mehr";
            else if (text.includes('invalid_state')) conflictType = "Status-Konflikt";

            // If the server explicitly rejected the logical request as an error, 
            // infinite retry won't fix it. We drop it and inform the user locally.
            self.registration.showNotification("Offline-Aktion verweigert", {
              body: `Eine deiner Offline-Aenderungen konnte nicht synchronisiert werden: ${conflictType}. Bitte ueberpruefe den Stand.`,
              icon: "/android-chrome-192x192.png",
              badge: "/favicon-32x32.png",
              tag: "offline-conflict",
              requireInteraction: true
            });
            console.warn(`[SW] Offline request dropped due to domain conflict: ${conflictType}`);
            continue;
          }
        }

        if (!response.ok && response.status >= 500) {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        console.error("[SW] BackgroundSync replay failed, scheduling retry:", error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    // Alert client we are back online and synced!
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "OFFLINE_SYNC_COMPLETE" }));
    });
  },
});

const NON_CACHEABLE_NAVIGATION_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin/",
  "/guide/",
  "/profile",
];

const runtimeCaching: import("serwist").RuntimeCaching[] = [
  {
    // Capture Next.js Server Action Mutations (POST requests)
    matcher: ({ request }: { request: Request }) => request.method === "POST",
    handler: new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
  },
  {
    matcher: ({ request, url }: { request: Request; url: URL }) =>
      request.mode === "navigate" &&
      !NON_CACHEABLE_NAVIGATION_PREFIXES.some((prefix) =>
        url.pathname.startsWith(prefix),
      ),
    handler: new NetworkFirst({
      cacheName: "jdav-pages",
      networkTimeoutSeconds: 4,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 60 * 60 * 24,
        }),
      ],
    }),
  },
  {
    matcher: ({ request }: { request: Request }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "worker",
    handler: new StaleWhileRevalidate({
      cacheName: "jdav-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        }),
      ],
    }),
  },
  {
    matcher: ({ request }: { request: Request }) =>
      request.destination === "image",
    handler: new CacheFirst({
      cacheName: "jdav-images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 96,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let data: {
    title?: string;
    body?: string;
    payload?: {
      url?: string;
    };
  } = {};

  try {
    data = event.data.json() as {
      title?: string;
      body?: string;
      payload?: {
        url?: string;
      };
    };
  } catch {
    data = {
      body: event.data.text(),
    };
  }

  const title = data.title || "JDAV Pfarrkirchen";
  const body = data.body || "Neue Benachrichtigung";
  const url = data.payload?.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }

        return undefined;
      }),
  );
});
