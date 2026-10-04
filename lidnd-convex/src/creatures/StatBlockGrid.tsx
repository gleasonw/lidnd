import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/errors";
import {
  analyzeStatBlock,
  Box,
  boxHeight,
  columnBoxes,
  gridFor,
  StatBlockShape,
} from "@/lib/statBlockLayout";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export type StatBlockItem = {
  key: string;
  name: string;
  url: string;
  storageId: Id<"_storage">;
  /** Null until measured; the grid measures and saves it. */
  layout: StatBlockShape | null;
  selected?: boolean;
};

const GAP = 12;
const CAPTION = 28;
export function StatBlockSizeControl({
  smaller,
  larger,
}: {
  smaller?: () => void;
  larger?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-xs"
        disabled={!smaller}
        onClick={smaller}
        aria-label="Smaller stat blocks"
      >
        A−
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5"
        disabled={!larger}
        onClick={larger}
        aria-label="Larger stat blocks"
      >
        A+
      </Button>
    </span>
  );
}

/**
 * Measures stat blocks that have no saved layout yet, and saves what it finds
 * so later views lay out before the images load.
 */
function useShapes(items: StatBlockItem[]) {
  const save = useMutation(api.files.saveStatBlockLayout);
  const [measured, setMeasured] = useState<Record<string, StatBlockShape>>({});
  const started = useRef(new Set<string>());
  useEffect(() => {
    for (const item of items) {
      if (item.layout || started.current.has(item.storageId)) continue;
      started.current.add(item.storageId);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const shape = analyzeStatBlock(img);
        setMeasured((m) => ({ ...m, [item.storageId]: shape }));
        void save({
          storageId: item.storageId,
          width: shape.width,
          height: shape.height,
          columns: shape.columns,
          content: shape.content,
          split: shape.split ?? undefined,
        }).catch(toastError);
      };
      img.src = item.url;
    }
  }, [items, save]);
  return (item: StatBlockItem) => item.layout ?? measured[item.storageId];
}

/** Whether an element's top edge is visible in its scroll container. */
function topInView(el: Element) {
  let parent = el.parentElement;
  while (parent && getComputedStyle(parent).overflowY === "visible") {
    parent = parent.parentElement;
  }
  const view = (parent ?? document.documentElement).getBoundingClientRect();
  const { top } = el.getBoundingClientRect();
  return top >= view.top && top < view.bottom - 80;
}

function useWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Stat blocks at a readable size whatever their source: a quarter-page card
 * and a full two-column page both read at one column of `size` pixels, the
 * page with its columns stacked. Packed shortest-column-first, in order.
 */
export function StatBlockGrid({
  items,
  size,
  readOnly,
}: {
  items: StatBlockItem[];
  size: number;
  readOnly: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const shapeOf = useShapes(items);
  const { units, unitWidth } = gridFor(width, size, GAP);
  // Inside the figure's 1px border.
  const inner = unitWidth - 2;
  const selectedKey = items.find((i) => i.selected)?.key;
  useEffect(() => {
    if (!selectedKey) return;
    const el = ref.current?.querySelector(`[data-key="${selectedKey}"]`);
    if (el && !topInView(el)) {
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [selectedKey]);

  const tops = new Array<number>(units).fill(0);
  const placed = items.map((item) => {
    const shape = shapeOf(item);
    const boxes = shape ? columnBoxes(shape) : null;
    const height =
      CAPTION +
      (shape && boxes
        ? boxes.reduce((sum, box) => sum + boxHeight(shape, box, inner), 0)
        : inner * 1.3) +
      2;
    const col = tops.indexOf(Math.min(...tops));
    const top = tops[col];
    tops[col] = top + height + GAP;
    return { item, shape, boxes, left: col * (unitWidth + GAP), top };
  });

  return (
    <div
      ref={ref}
      className="relative"
      style={{ height: Math.max(0, Math.max(...tops) - GAP) }}
    >
      {width > 0 &&
        placed.map(({ item, shape, boxes, left, top }) => (
          <figure
            key={item.key}
            data-key={item.key}
            className={cn(
              "absolute overflow-hidden rounded-md border bg-background",
              item.selected && "ring-2 ring-primary",
            )}
            style={{ left, top, width: unitWidth }}
          >
            <figcaption
              className="flex items-center gap-2 px-2 text-xs"
              style={{ height: CAPTION }}
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.name}
              </span>
              {!readOnly && item.layout && (
                <ColumnsToggle
                  storageId={item.storageId}
                  columns={item.layout.columns}
                />
              )}
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Open
              </a>
            </figcaption>
            {shape && boxes ? (
              boxes.map((box, i) => (
                <Crop
                  key={i}
                  url={item.url}
                  shape={shape}
                  box={box}
                  width={inner}
                  // One image to assistive tech; the other crops repeat it.
                  alt={i === 0 ? `${item.name} stat block` : ""}
                  className={cn(i > 0 && "border-t border-dashed")}
                />
              ))
            ) : (
              <div
                className="animate-pulse bg-muted"
                style={{ height: inner * 1.3 }}
              />
            )}
          </figure>
        ))}
    </div>
  );
}

function ColumnsToggle({
  storageId,
  columns,
}: {
  storageId: Id<"_storage">;
  columns: 1 | 2;
}) {
  const setColumns = useMutation(api.files.setStatBlockColumns);
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-foreground hover:underline"
      title={
        columns === 2
          ? "Shown as a two-column page with its columns stacked"
          : "Shown as a single column"
      }
      onClick={() =>
        void setColumns({ storageId, columns: columns === 2 ? 1 : 2 }).catch(
          toastError,
        )
      }
    >
      {columns === 2 ? "Show whole page" : "Split columns"}
    </button>
  );
}

/** A region of an image, scaled to `width`. */
function Crop({
  url,
  shape,
  box,
  width,
  alt,
  className,
}: {
  url: string;
  shape: StatBlockShape;
  box: Box;
  width: number;
  alt: string;
  className?: string;
}) {
  const imgWidth = width / (box.right - box.left);
  const imgHeight = (imgWidth * shape.height) / shape.width;
  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ height: boxHeight(shape, box, width) }}
    >
      <img
        src={url}
        alt={alt}
        className="block max-w-none"
        style={{
          width: imgWidth,
          height: imgHeight,
          marginLeft: -box.left * imgWidth,
          marginTop: -box.top * imgHeight,
        }}
      />
    </div>
  );
}
