export interface SyncPushSubscriptionResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
}

/**
 * Synchronizes an existing Web Push subscription with the backend server.
 * Accepts an optional AbortSignal for lifecycle cleanup and request cancellation.
 */
export async function syncPushSubscriptionToBackend(
  subscription: PushSubscriptionJSON,
  signal?: AbortSignal,
): Promise<SyncPushSubscriptionResult> {
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json",
    },
    body: JSON.stringify({ subscription }),
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { ok: false, status: 401 };
    }

    if (response.status === 403) {
      console.warn("[Push] Subscription blocked by CSRF/origin policy");
      return { ok: false, status: 403, error: "CSRF/origin policy blocked" };
    }

    let details: string;
    let code: string | undefined;
    try {
      const data = (await response.json()) as {
        error?: string;
        code?: string;
      };
      code = data.code;
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
    return { ok: false, status: response.status, error: details, code };
  }

  return { ok: true, status: response.status };
}
