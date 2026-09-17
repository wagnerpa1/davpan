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

const notificationTitle =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_DAV_APP_NAME) ||
  "DAV Pfarrkirchen";

const AUTH_SENSITIVE_CACHES = [
  "jdav-pages",
  "jdav-touren",
  "jdav-images",
] as const;

const LOGICAL_ERROR_PATTERN = /"error"\s*:\s*"(?:\\.|[^"\\])+"/;
const SUCCESS_FALSE_PATTERN = /"success"\s*:\s*false/;

async function clearAuthSensitiveCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  const deletions: Promise<boolean>[] = [];
  for (const name of cacheNames) {
    if ((AUTH_SENSITIVE_CACHES as readonly string[]).includes(name)) {
      deletions.push(caches.delete(name));
    }
  }
  await Promise.all(deletions);
}

const CONFLICT_CODE_DESCRIPTIONS: Record<string, string> = {
  stale_write: "Daten veraltet",
  inventory_exceeded: "Material nicht mehr verfügbar",
  capacity_exceeded: "Kein freier Platz mehr",
  invalid_state: "Status-Konflikt",
  unauthorized: "Sitzung abgelaufen",
  conflict: "Konflikt",
};

function extractErrorCode(bodyText: string): string | null {
  try {
    const parsed = JSON.parse(bodyText);
    if (parsed && typeof parsed === "object") {
      if (
        parsed.error &&
        typeof parsed.error === "object" &&
        typeof parsed.error.code === "string"
      ) {
        return parsed.error.code;
      }
      if (typeof parsed.code === "string") {
        return parsed.code;
      }
    }
  } catch {
    // If not standard JSON (e.g. Next.js RSC flight protocol), extract code via regex
    const codeMatch = /"code"\s*:\s*"([a-zA-Z0-9_-]+)"/.exec(bodyText);
    if (codeMatch?.[1]) {
      return codeMatch[1];
    }
  }
  return null;
}

function classifyConflictType(bodyText: string): string {
  const structuredCode = extractErrorCode(bodyText);
  if (structuredCode && CONFLICT_CODE_DESCRIPTIONS[structuredCode]) {
    return CONFLICT_CODE_DESCRIPTIONS[structuredCode];
  }

  // Graceful fallback to substring matching for unformatted responses
  if (bodyText.includes("stale_write")) return "Daten veraltet";
  if (
    bodyText.includes("Material") ||
    bodyText.includes("inventory_exceeded") ||
    bodyText.includes("Insufficient inventory")
  ) {
    return "Material nicht mehr verfügbar";
  }
  if (
    bodyText.includes("ausgebucht") ||
    bodyText.includes("capacity_exceeded") ||
    bodyText.includes("Already registered")
  ) {
    return "Kein freier Platz mehr";
  }
  if (bodyText.includes("invalid_state")) return "Status-Konflikt";
  if (
    bodyText.includes("Nicht eingeloggt") ||
    bodyText.includes("angemeldet sein") ||
    bodyText.includes("Nicht authentifiziert")
  ) {
    return "Sitzung abgelaufen";
  }
  return "Konflikt";
}

function hasLogicalActionFailure(bodyText: string): boolean {
  return (
    SUCCESS_FALSE_PATTERN.test(bodyText) || LOGICAL_ERROR_PATTERN.test(bodyText)
  );
}

type ReplayOutcome = "ok" | "conflict" | "retry";

function classifyReplayOutcome(
  response: Response,
  bodyText: string,
): ReplayOutcome {
  if (
    response.status >= 500 ||
    response.status === 408 ||
    response.status === 429
  ) {
    return "retry";
  }
  if (!response.ok) {
    return "conflict";
  }
  if (hasLogicalActionFailure(bodyText)) {
    return "conflict";
  }
  return "ok";
}

async function notifyOfflineConflict(conflictType: string): Promise<void> {
  await self.registration.showNotification("Offline-Aktion verweigert", {
    body: `Eine deiner Offline-Änderungen konnte nicht synchronisiert werden: ${conflictType}. Bitte überprüfe den Stand.`,
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    tag: "offline-conflict",
    requireInteraction: true,
  });
}

async function notifyClientsSyncComplete(): Promise<void> {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "OFFLINE_SYNC_COMPLETE" });
  }
}

const bgSyncPlugin = new BackgroundSyncPlugin("offline-mutations-queue", {
  maxRetentionTime: 24 * 60, // Retry for max 24 Hours
  onSync: async ({ queue }) => {
    let entry = await queue.shiftRequest();
    let replayedAny = false;

    while (entry) {
      try {
        const response = await fetch(entry.request.clone());
        const bodyText = await response.clone().text();
        const outcome = classifyReplayOutcome(response, bodyText);

        if (outcome === "retry") {
          throw new Error(`Server returned ${response.status}`);
        }

        if (outcome === "conflict") {
          const conflictType = classifyConflictType(bodyText);
          await notifyOfflineConflict(conflictType);
          console.warn(
            `[SW] Offline request dropped due to domain conflict: ${conflictType}`,
          );
          entry = await queue.shiftRequest();
          continue;
        }

        replayedAny = true;
      } catch (error) {
        console.error(
          "[SW] BackgroundSync replay failed, scheduling retry:",
          error,
        );
        if (entry) {
          await queue.unshiftRequest(entry);
        }
        throw error;
      }
      entry = await queue.shiftRequest();
    }

    if (replayedAny) {
      await notifyClientsSyncComplete();
    }
  },
});

const clearAuthCachesPlugin = {
  fetchDidSucceed: async ({ response }: { response: Response }) => {
    await clearAuthSensitiveCaches();
    return response;
  },
  fetchDidFail: async () => {
    // User intended to leave the session; drop cached private pages even if
    // the network sign-out request could not complete yet.
    await clearAuthSensitiveCaches();
  },
};

const NON_CACHEABLE_NAVIGATION_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin/",
  "/guide/",
  "/profile",
];

const runtimeCaching: import("serwist").RuntimeCaching[] = [
  {
    // Sign-out must never enter the offline mutation queue.
    matcher: ({ request, url }: { request: Request; url: URL }) =>
      request.method === "POST" && url.pathname === "/auth/signout",
    handler: new NetworkOnly({
      plugins: [clearAuthCachesPlugin],
    }),
  },
  {
    // Only Next.js Server Actions — not arbitrary API/form POSTs.
    matcher: ({ request }: { request: Request }) =>
      request.method === "POST" && request.headers.has("Next-Action"),
    handler: new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/touren"),
    handler: new NetworkFirst({
      cacheName: "jdav-touren",
      networkTimeoutSeconds: 4,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20, // Strict limit for offline touren
          maxAgeSeconds: 60 * 60 * 24 * 30,
        }),
      ],
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
          maxAgeSeconds: 60 * 60 * 12,
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
          maxEntries: 40,
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

self.addEventListener("message", (event) => {
  const message = event.data as { type?: string } | undefined;
  if (message?.type !== "CLEAR_AUTH_CACHES") {
    return;
  }

  event.waitUntil(clearAuthSensitiveCaches());
});

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

  const title = data.title || notificationTitle;
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
