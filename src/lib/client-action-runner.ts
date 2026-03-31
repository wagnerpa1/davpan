export async function runClientAction<T>(
  actionCall: () => Promise<T>,
): Promise<T | { offlineQueued: true }> {
  try {
    return await actionCall();
  } catch (error: unknown) {
    // Next.js Server Actions return a TypeError when the network is unreachable
    if (
      (error instanceof TypeError &&
        error.message.includes("Failed to fetch")) ||
      !window.navigator.onLine
    ) {
      console.warn(
        "[Offline] Action failed to fetch, queued by Service Worker",
      );
      return { offlineQueued: true };
    }
    // Unknown client-side error
    throw error;
  }
}
