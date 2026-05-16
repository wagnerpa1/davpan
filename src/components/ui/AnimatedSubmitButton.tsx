"use client";

import { Check } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

interface AnimatedSubmitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  successKey: string;
  successChildId?: string;
  successLabel?: string;
  children: ReactNode;
}

export function AnimatedSubmitButton({
  successKey,
  successChildId,
  successLabel = "Gespeichert",
  children,
  className,
  ...buttonProps
}: AnimatedSubmitButtonProps) {
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const customEvent = event as CustomEvent<{
        successKey?: string;
        childId?: string | null;
      }>;

      const eventSuccessKey = customEvent.detail?.successKey;
      const eventChildId = customEvent.detail?.childId;

      if (eventSuccessKey !== successKey) {
        return;
      }

      if (successChildId && eventChildId !== successChildId) {
        return;
      }

      setIsSuccessVisible(true);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        setIsSuccessVisible(false);
      }, 2000);
    };

    window.addEventListener("profile:form-success", onSuccess as EventListener);

    return () => {
      window.removeEventListener(
        "profile:form-success",
        onSuccess as EventListener,
      );
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [successChildId, successKey]);

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "submit"}
      className={`${className ?? ""} ${
        isSuccessVisible ? "animate-pulse bg-emerald-600" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {isSuccessVisible && <Check className="h-4 w-4" />}
        {isSuccessVisible ? successLabel : children}
      </span>
    </button>
  );
}
