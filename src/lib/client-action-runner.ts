export type OfflineQueuedResult = { offlineQueued: true };

function isNetworkFetchFailure(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
}

export function isOfflineQueued(
  result: unknown,
): result is OfflineQueuedResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "offlineQueued" in result &&
    (result as OfflineQueuedResult).offlineQueued === true
  );
}

export async function runClientAction<T>(
  actionCall: () => Promise<T>,
): Promise<T | OfflineQueuedResult> {
  try {
    return await actionCall();
  } catch (error: unknown) {
    // Next.js Server Actions throw TypeError when the network is unreachable.
    // The Service Worker Background Sync plugin queues the underlying POST.
    if (isNetworkFetchFailure(error)) {
      console.warn(
        "[Offline] Action failed to fetch, queued by Service Worker",
      );
      return { offlineQueued: true };
    }
    throw error;
  }
}

/** Ask the active service worker to drop caches that may contain private HTML. */
export function requestClearAuthCaches(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({ type: "CLEAR_AUTH_CACHES" });
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: "CLEAR_AUTH_CACHES" });
  });
}
