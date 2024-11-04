import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function compareCreatedAt(
  a: { created_at: Date | null },
  b: { created_at: Date | null }
) {
  if (!a.created_at) {
    return 1;
  }
  if (!b.created_at) {
    return -1;
  }
  return a.created_at.getTime() - b.created_at.getTime();
}

export function formatSeconds(seconds: number) {
  const hourTime = seconds / 60;
  const hourCount = Math.floor(hourTime);
  const minuteRemainder = seconds % 60;

  if (hourTime >= 1) {
    return `${hourCount} hour${hourCount > 1 ? "s" : ""} ${
      minuteRemainder ? `${Math.floor(minuteRemainder)} minutes` : ""
    }`;
  }

  return `${Math.floor(seconds % 60)} minutes`;
}
