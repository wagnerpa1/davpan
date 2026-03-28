/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
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

const NON_CACHEABLE_NAVIGATION_PREFIXES = [
  "/api/",
  "/auth/",
  "/admin/",
  "/guide/",
  "/profile",
];

const runtimeCaching = [
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
