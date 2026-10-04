import { useState } from "react";

const SIZES = [320, 360, 400, 440, 480, 540];
const SIZE_KEY = "lidnd:statBlockColumnWidth";

/** Screen width of one printed column, remembered per browser. */
export function useStatBlockSize() {
  const [size, setSize] = useState(() => {
    const saved = Number(localStorage.getItem(SIZE_KEY));
    return SIZES.includes(saved) ? saved : 400;
  });
  const step = (by: number) => {
    const next =
      SIZES[Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(size) + by))];
    localStorage.setItem(SIZE_KEY, String(next));
    setSize(next);
  };
  return {
    size,
    smaller: SIZES.indexOf(size) > 0 ? () => step(-1) : undefined,
    larger: SIZES.indexOf(size) < SIZES.length - 1 ? () => step(1) : undefined,
  };
}
