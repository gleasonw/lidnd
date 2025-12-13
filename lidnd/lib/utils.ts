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

export function isEmptyParagraph(html: string | null) {
  if (!html) {
    return true;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const p = doc.querySelector("p");
  console.log(p);
  if (!p) return false;
  return p.textContent?.trim() === "" && p.children.length === 0;
}
const pastelLabels = ["#7eb2bc", "#e39ca0", "#edab33", "#94ae7f"];
const solidColors = [
  "#8abd11",
  "#0063c3",
  "#ff1353",
  "#fe9c1c",
  "#632469",
  "#fff91e",
  "#57b3bd",
  "#1f105b",
  "#ff1a13",
];

export const labelColors = [...pastelLabels, ...solidColors];
