"use client";

import { type ChangeEvent, forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea, type TextareaProps } from "./textarea";

interface TextareaWithCounterProps extends TextareaProps {
  maxLength: number;
}

/**
 * A Textarea wrapper that includes a character counter.
 * Provides visual feedback as the user approaches the character limit.
 */
const getTextLength = (
  textValue: TextareaProps["value"] | TextareaProps["defaultValue"],
) => (textValue == null ? 0 : String(textValue).length);

export const TextareaWithCounter = forwardRef<
  HTMLTextAreaElement,
  TextareaWithCounterProps
>(function TextareaWithCounter(
  { maxLength, onChange, value, defaultValue, className, ...props },
  ref,
) {
  const [count, setCount] = useState(() =>
    getTextLength(value !== undefined ? value : defaultValue),
  );

  useEffect(() => {
    if (value !== undefined) {
      setCount(getTextLength(value));
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCount(e.target.value.length);
    if (onChange) {
      onChange(e);
    }
  };

  const isNearLimit = count > maxLength * 0.9;
  const isAtLimit = count >= maxLength;

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        maxLength={maxLength}
        className={cn(className, "pb-8")}
      />
      <div
        className={cn(
          "absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-wider transition-colors pointer-events-none",
          isAtLimit
            ? "text-red-500"
            : isNearLimit
              ? "text-orange-500"
              : "text-slate-400",
        )}
        aria-live="polite"
      >
        {count} / {maxLength}
      </div>
    </div>
  );
});

TextareaWithCounter.displayName = "TextareaWithCounter";
