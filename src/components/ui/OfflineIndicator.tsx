"use client";

import { AlertCircle, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      // When coming back online, background sync might trigger
      setSyncing(true);
      setTimeout(() => setSyncing(false), 5000); // Hide syncing after 5s unless SW says otherwise
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to Service Worker messages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "OFFLINE_SYNC_COMPLETE") {
        setSyncing(false);
        setSyncComplete(true);
        setTimeout(() => setSyncComplete(false), 4000);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  if (!isOffline && !syncing && !syncComplete) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-sm shadow-xl animate-in slide-in-from-bottom-5 duration-300">
      {isOffline && (
        <>
          <WifiOff className="h-4 w-4 text-amber-500" />
          <span className="text-slate-700">Offline-Modus aktiv</span>
        </>
      )}
      {!isOffline && syncing && (
        <>
          <Wifi className="h-4 w-4 text-blue-500 animate-pulse" />
          <span className="text-slate-700">Synchronisiere Änderungen...</span>
        </>
      )}
      {!isOffline && !syncing && syncComplete && (
        <>
          <CheckCircle2 className="h-4 w-4 text-jdav-green" />
          <span className="text-slate-700">Synchr. abgeschlossen</span>
        </>
      )}
    </div>
  );
}
