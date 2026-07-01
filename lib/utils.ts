import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD currency, no cents */
export function formatMoney(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "";
  return Math.round(value).toLocaleString("en-US");
}

/** Parse a formatted currency string back to number */
export function parseMoney(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-") return undefined;
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
