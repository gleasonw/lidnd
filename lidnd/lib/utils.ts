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
