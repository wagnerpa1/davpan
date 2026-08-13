let lastSyncTs = 0;

export function shouldThrottleSync(): boolean {
  const now = Date.now();
  if (now - lastSyncTs < 60_000) {
    return true;
  }
  lastSyncTs = now;
  return false;
}
