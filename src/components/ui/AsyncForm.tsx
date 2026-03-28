"use client";

import {
  type FormHTMLAttributes,
  type ReactNode,
  type FormEvent,
  useCallback,
  useState,
} from "react";

interface AsyncFormProps extends FormHTMLAttributes<HTMLFormElement> {
  successKey: string;
  successChildId?: string;
  children: ReactNode;
}

export function AsyncForm({
  action,
  method = "POST",
  successKey,
  successChildId,
  children,
  onSubmit,
  ...formProps
}: AsyncFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      onSubmit?.(event as any);
      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();

      const form = event.currentTarget;
      const formAction =
        typeof action === "string" && action.length > 0 ? action : form.action;

      if (!formAction) {
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch(formAction, {
          method: method.toUpperCase(),
          body: new FormData(form),
          credentials: "same-origin",
          headers: {
            "x-requested-with": "XMLHttpRequest",
            accept: "application/json",
          },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Async form submit failed", text);
          return;
        }

        window.dispatchEvent(
          new CustomEvent("profile:form-success", {
            detail: {
              successKey,
              childId: successChildId ?? null,
            },
          }),
        );
      } catch (error) {
        console.error("Async form submit error", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [action, method, onSubmit, successChildId, successKey],
  );

  return (
    <form
      {...formProps}
      action={action}
      method={method}
      onSubmit={handleSubmit}
    >
      <fieldset disabled={isSubmitting} className="contents">
        {children}
      </fieldset>
    </form>
  );
}

