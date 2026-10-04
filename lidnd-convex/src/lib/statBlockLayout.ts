/**
 * Stat blocks come as images of printed pages: a quarter-page card, a half
 * page, a full 8.5x11 page. What decides how wide one must be drawn to be
 * readable isn't its pixel size but how many printed text columns it spans.
 * We crop each to its text and draw every printed column at the same width,
 * stacking a two-column page's columns into one.
 */

/** A region of an image, as fractions of its width and height. */
export type Box = { left: number; top: number; right: number; bottom: number };

export type StatBlockShape = {
  width: number;
  height: number;
  /** Printed text columns across the image. */
  columns: 1 | 2;
  /** The text, without page margins, edge tabs, or art beside it. */
  content: Box;
  /** Two-column pages: banner (if any), left column, right column. */
  split: Box[] | null;
};

const SAMPLE_WIDTH = 400;

/** Finds an image's text, and its columns if it's laid out in two. */
export function analyzeStatBlock(img: HTMLImageElement): StatBlockShape {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const fallback: StatBlockShape = {
    width,
    height,
    columns: width / height > 1.1 || width > 1600 ? 2 : 1,
    content: { left: 0, top: 0, right: 1, bottom: 1 },
    split: null,
  };
  const w = Math.min(SAMPLE_WIDTH, width);
  const h = Math.max(1, Math.round((height * w) / width));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  let data: Uint8ClampedArray;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // Cross-origin image without CORS headers: the canvas is tainted.
    return fallback;
  }
  const ink = inkMask(data, w, h);
  const at = (x: number, y: number) => ink[y * w + x];
  const minGap = Math.max(2, Math.round(w * 0.012));

  // Text crosses many lines, so a pixel column through text switches between
  // ink and paper many times. Tabs, rules, and art switch only a few times.
  const colInk = new Array<number>(w).fill(0);
  const switches = new Array<number>(w).fill(0);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      colInk[x] += at(x, y);
      if (at(x, y) && (y === 0 || !at(x, y - 1))) switches[x]++;
    }
  }
  const sorted = [...switches].sort((a, b) => a - b);
  const threshold = Math.max(4, sorted[Math.floor(w * 0.75)] * 0.25);
  const textLike = switches.map((s) => s >= threshold);
  // Body text is wide; a narrow streak (lettering on a page tab) isn't.
  const reach = Math.max(2, Math.round(w * 0.02));
  const isText = (x: number) => {
    let near = 0;
    for (let i = x - reach; i <= x + reach; i++) if (textLike[i]) near++;
    return near > reach;
  };
  let x0 = switches.findIndex((_, x) => isText(x));
  if (x0 < 0) return fallback;
  let x1 = w - 1;
  while (!isText(x1)) x1--;

  // Widen to ink touching the text (right-aligned labels, borders), stopping
  // at a margin wide enough to separate tabs and art.
  const widen = (from: number, step: 1 | -1) => {
    let edge = from;
    let gap = 0;
    for (let x = from + step; x >= 0 && x < w && gap < minGap; x += step) {
      if (colInk[x] > 1) [edge, gap] = [x, 0];
      else gap++;
    }
    return edge;
  };
  x0 = widen(x0, -1);
  x1 = widen(x1, 1);
  /** First and last rows with ink between columns `left` and `right`. */
  const rows = (left: number, right: number, from = 0): [number, number] => {
    const inked = (y: number) => {
      for (let x = left; x <= right; x++) if (at(x, y)) return true;
      return false;
    };
    let top = from;
    while (top < h - 1 && !inked(top)) top++;
    let bottom = h - 1;
    while (bottom > top && !inked(bottom)) bottom--;
    return [top, bottom];
  };
  const [y0, y1] = rows(x0, x1);
  // Pixel bounds (inclusive) to fractions, with a little paper around them.
  const box = (l: number, t: number, r: number, b: number): Box => ({
    left: Math.max(0, l - minGap) / w,
    top: Math.max(0, t - minGap) / h,
    right: Math.min(w, r + 1 + minGap) / w,
    bottom: Math.min(h, b + 1 + minGap) / h,
  });
  const single: StatBlockShape = {
    width,
    height,
    columns: 1,
    content: box(x0, y0, x1, y1),
    split: null,
  };

  // A gutter: the longest blank stripe near the middle of the text, below
  // where a title banner might span both columns.
  const bodyTop = y0 + Math.floor((y1 - y0) * 0.25);
  const blank = (x: number) => {
    let total = 0;
    for (let y = bodyTop; y <= y1; y++) total += at(x, y);
    return total <= (y1 - bodyTop) * 0.004;
  };
  let gutter: [number, number] | null = null;
  const span = x1 - x0;
  for (let x = x0 + Math.floor(span * 0.3); x < x0 + span * 0.7; x++) {
    if (!blank(x)) continue;
    let end = x;
    while (end + 1 < x1 && blank(end + 1)) end++;
    if (!gutter || end - x > gutter[1] - gutter[0]) gutter = [x, end];
    x = end;
  }
  const textBetween = (from: number, to: number) => {
    for (let x = from; x < to; x++) if (isText(x)) return true;
    return false;
  };
  if (
    !gutter ||
    gutter[1] - gutter[0] + 1 < minGap ||
    !textBetween(x0, gutter[0]) ||
    !textBetween(gutter[1] + 1, x1 + 1)
  ) {
    return single;
  }

  // Walk up to where the gutter begins: the first row with no gap across it,
  // like a title banner. Lines that overrun nick its edges, so any gap wide
  // enough counts.
  const [g0, g1] = gutter;
  const rowHasGap = (y: number) => {
    let run = 0;
    for (let x = g0; x <= g1; x++) {
      run = at(x, y) ? 0 : run + 1;
      if (run >= minGap) return true;
    }
    return false;
  };
  let top = bodyTop;
  while (top > y0 && rowHasGap(top - 1)) top--;

  // Crop both columns to the same width so their text draws the same size.
  const colWidth = Math.max(g0 - 1 - x0, x1 - (g1 + 1));
  const split: Box[] = [];
  if (top - y0 > h * 0.02) split.push(box(x0, y0, x1, top - 1));
  const [lt, lb] = rows(x0, g0 - 1, top);
  const [rt, rb] = rows(g1 + 1, x1, top);
  split.push(
    box(x0, lt, Math.min(w - 1, x0 + colWidth), lb),
    box(g1 + 1, rt, Math.min(w - 1, g1 + 1 + colWidth), rb),
  );
  return { ...single, columns: 2, split };
}

/** 1 where a pixel differs clearly from the page background, else 0. */
function inkMask(data: Uint8ClampedArray, w: number, h: number) {
  const lum = (i: number) =>
    0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  // Background: median luminance of a sparse sample.
  const sample: number[] = [];
  for (let i = 0; i < w * h; i += 37) sample.push(lum(i));
  sample.sort((a, b) => a - b);
  const bg = sample[Math.floor(sample.length / 2)];
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = Math.abs(lum(i) - bg) > 48 ? 1 : 0;
  return mask;
}

/** The crops to stack, top to bottom, for the shape's column count. */
export function columnBoxes(shape: StatBlockShape): Box[] {
  if (shape.columns === 1) return [shape.content];
  if (shape.split) return shape.split;
  // Marked two-column by hand where none was detected: halve the text.
  const { left, top, right, bottom } = shape.content;
  const mid = (left + right) / 2;
  return [
    { left, top, right: mid, bottom },
    { left: mid, top, right, bottom },
  ];
}

/** Height of `box` when drawn `width` pixels wide. */
export function boxHeight(shape: StatBlockShape, box: Box, width: number) {
  return (
    (width * (box.bottom - box.top) * shape.height) /
    ((box.right - box.left) * shape.width)
  );
}

/**
 * Splits `paneWidth` into the number of columns whose width comes closest to
 * `unit`. Rounding rather than flooring: one 740px column draws text nearly
 * twice the chosen size, while two 364px ones are only a little small.
 */
export function gridFor(paneWidth: number, unit: number, gap: number) {
  const units = Math.max(1, Math.round((paneWidth + gap) / (unit + gap)));
  const unitWidth = (paneWidth - gap * (units - 1)) / units;
  return { units, unitWidth };
}
