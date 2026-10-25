"use client";

import { useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
  userAgentData?: {
    brands: Array<{ brand: string }>;
  };
}

const MOBILE_VIEW_QUERY = "(max-width: 767px)";

function isChromiumBasedBrowser() {
  const browserNavigator = navigator as NavigatorWithStandalone;
  const brands = browserNavigator.userAgentData?.brands ?? [];

  if (
    brands.some(({ brand }) => /Chromium|Chrome|Edge|Opera|Brave/i.test(brand))
  ) {
    return true;
  }

  return /Chromium|Chrome|CriOS|Edg|OPR|Brave/i.test(navigator.userAgent);
}

function isAppInstalled() {
  const browserNavigator = navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    browserNavigator.standalone === true
  );
}

export function PwaInstallPrompt() {
  useEffect(() => {
    const mobileView = window.matchMedia(MOBILE_VIEW_QUERY);

    function handleBeforeInstallPrompt(event: Event) {
      if (
        !isChromiumBasedBrowser() ||
        !mobileView.matches ||
        isAppInstalled()
      ) {
        return;
      }

      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      void installEvent.prompt().catch((error: unknown) => {
        console.error("Unable to open the PWA install prompt.", error);
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  return null;
}
