"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getRouteTransitionKind,
  isMoreMenuRoute,
  isPrimaryNavRoute,
  type RouteTransitionKind,
} from "../../lib/navigation/route-transitions";

interface RouteTransitionShellProps {
  children: React.ReactNode;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(min-width: 768px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isDesktop;
}

function getTransitionVariants(kind: RouteTransitionKind) {
  if (kind === "slide-left") {
    return {
      enter: {
        opacity: 0,
        x: "18%",
        scale: 0.995,
      },
      center: {
        opacity: 1,
        x: 0,
        scale: 1,
      },
      exit: {
        opacity: 0,
        x: "-12%",
        scale: 0.995,
      },
    };
  }

  if (kind === "slide-right") {
    return {
      enter: {
        opacity: 0,
        x: "-18%",
        scale: 0.995,
      },
      center: {
        opacity: 1,
        x: 0,
        scale: 1,
      },
      exit: {
        opacity: 0,
        x: "12%",
        scale: 0.995,
      },
    };
  }

  return {
    enter: {
      opacity: 0,
      scale: 0.995,
    },
    center: {
      opacity: 1,
      scale: 1,
    },
    exit: {
      opacity: 0,
      scale: 0.995,
    },
  };
}

export function RouteTransitionShell({ children }: RouteTransitionShellProps) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const previousPathnameRef = useRef(pathname);

  const transitionKind = useMemo(
    () =>
      getRouteTransitionKind(previousPathnameRef.current, pathname, isDesktop),
    [isDesktop, pathname],
  );

  useEffect(() => {
    previousPathnameRef.current = pathname;
  }, [pathname]);

  const motionEnabled = !prefersReducedMotion;
  const variants = getTransitionVariants(transitionKind);
  const transition =
    transitionKind === "fade"
      ? { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }
      : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };

  const routeTone =
    isPrimaryNavRoute(pathname) || isMoreMenuRoute(pathname)
      ? "route-nav"
      : "route-detail";

  if (!motionEnabled) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <div
      className="grid w-full overflow-x-hidden"
      data-route-transition={transitionKind}
      data-route-tone={routeTone}
    >
      <AnimatePresence mode="sync" initial={false} custom={transitionKind}>
        <motion.div
          key={pathname}
          custom={transitionKind}
          className="col-start-1 row-start-1 w-full will-change-transform"
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
