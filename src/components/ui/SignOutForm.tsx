"use client";

import type { ReactNode } from "react";
import { requestClearAuthCaches } from "@/lib/client-action-runner";

interface SignOutFormProps {
  children: ReactNode;
  className?: string;
}

/**
 * Clears auth-sensitive service-worker caches, then posts to /auth/signout.
 */
export function SignOutForm({ children, className }: SignOutFormProps) {
  return (
    <form
      action="/auth/signout"
      method="POST"
      className={className}
      onSubmit={() => {
        requestClearAuthCaches();
      }}
    >
      {children}
    </form>
  );
}
