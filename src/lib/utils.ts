import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes resolving conflicts.
 * Uses `clsx` to construct class strings conditionally, and `twMerge` to handle
 * conflicting Tailwind classes correctly (e.g., overriding padding/margins).
 *
 * @param inputs - Array of class values, conditions, or undefined/null.
 * @returns A cleanly merged Tailwind CSS class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
