"use client";

import { type ChangeEvent, useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea, type TextareaProps } from "./textarea";

interface TextareaWithCounterProps extends TextareaProps {
  maxLength: number;
}

/**
 * A Textarea wrapper that includes a character counter.
 * Provides visual feedback as the user approaches the character limit.
 */
export function TextareaWithCounter({
  maxLength,
  onChange,
  defaultValue,
  className,
  ...props
}: TextareaWithCounterProps) {
  const [count, setCount] = useState(
    defaultValue ? String(defaultValue).length : 0,
  );

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
}
