"use client";

import { CheckCircle2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

const SYNC_COMPLETE_VISIBLE_MS = 4000;

/**
 * Floating indicator for offline mode and Background Sync completion.
 * Sync completion is only shown when the service worker reports a finished replay.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    let syncCompleteTimer: ReturnType<typeof setTimeout> | null = null;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type !== "OFFLINE_SYNC_COMPLETE") {
        return;
      }
      setSyncComplete(true);
      if (syncCompleteTimer) clearTimeout(syncCompleteTimer);
      syncCompleteTimer = setTimeout(
        () => setSyncComplete(false),
        SYNC_COMPLETE_VISIBLE_MS,
      );
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      if (syncCompleteTimer) clearTimeout(syncCompleteTimer);
    };
  }, []);

  if (!isOffline && !syncComplete) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-sm shadow-xl animate-in slide-in-from-bottom-5 duration-300">
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 text-amber-500" />
          <span className="text-slate-700">Offline-Modus aktiv</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 text-jdav-green" />
          <span className="text-slate-700">Synchr. abgeschlossen</span>
        </>
      )}
    </div>
  );
}
