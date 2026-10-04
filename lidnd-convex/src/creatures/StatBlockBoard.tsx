import { useRef, useState } from "react";
import { EnterFullScreenIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type StatBlock = { id: string; name: string; url: string };

/** Stable positions, natural image heights, and an explicit width override.
 * Pixel dimensions cannot tell us the physical size or text density of a scan.
 */
export function StatBlockBoard({
  blocks,
  selectedId,
}: {
  blocks: StatBlock[];
  selectedId?: string;
}) {
  const [wideIds, setWideIds] = useState<Set<string>>(() => new Set());

  return (
    <div style={{ containerType: "inline-size" }}>
      <div className="stat-block-board grid grid-cols-1 items-start gap-3">
        {blocks.map((block) => {
          const wide = wideIds.has(block.id);
          return (
            <figure
              key={block.id}
              className={cn(
                "min-w-0 overflow-hidden rounded-md border bg-background",
                wide && "col-span-full",
                selectedId === block.id && "ring-2 ring-primary",
              )}
            >
              <figcaption className="flex flex-wrap items-center justify-between gap-1 border-b px-2 py-1">
                <span className="min-w-0 break-words text-xs font-medium">
                  {block.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  aria-label={`Wide layout for ${block.name}`}
                  aria-pressed={wide}
                  title="Give this stat block the full board width"
                  onClick={() =>
                    setWideIds((previous) => {
                      const next = new Set(previous);
                      if (next.has(block.id)) next.delete(block.id);
                      else next.add(block.id);
                      return next;
                    })
                  }
                >
                  {wide ? "Compact" : "Widen"}
                </Button>
              </figcaption>
              <StatBlockReader block={block} />
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function StatBlockReader({ block }: { block: StatBlock }) {
  const [fitPage, setFitPage] = useState(true);
  const [zoom, setZoom] = useState(100);
  const imageRef = useRef<HTMLImageElement>(null);
  const changeZoom = (delta: number) => {
    const image = imageRef.current;
    let current = zoom;
    if (fitPage && image?.naturalHeight && image.clientWidth) {
      current = Math.min(
        100,
        (image.clientHeight * image.naturalWidth * 100) /
          (image.naturalHeight * image.clientWidth),
      );
    }
    setFitPage(false);
    setZoom(Math.min(250, Math.max(10, Math.round(current + delta))));
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setFitPage(true);
          setZoom(100);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={`Expand ${block.name} stat block`}
        >
          <img
            src={block.url}
            alt={`${block.name} stat block`}
            className="h-auto w-full"
          />
          <span className="absolute right-2 top-2 rounded border bg-background/90 p-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
            <EnterFullScreenIcon aria-hidden />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[92dvh] w-[96vw] max-w-6xl flex-col gap-3 p-3 sm:p-4"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogTitle className="pr-9 text-base">{block.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Stat block reader. Fit the whole page or zoom in and scroll to read.
        </DialogDescription>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={!fitPage && zoom === 100 ? "secondary" : "outline"}
            aria-pressed={!fitPage && zoom === 100}
            onClick={() => {
              setFitPage(false);
              setZoom(100);
            }}
          >
            Fit width
          </Button>
          <Button
            size="sm"
            variant={fitPage ? "secondary" : "outline"}
            aria-pressed={fitPage}
            onClick={() => setFitPage(true)}
          >
            Fit page
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Zoom out"
            disabled={!fitPage && zoom <= 10}
            onClick={() => changeZoom(-25)}
          >
            −
          </Button>
          <span
            className="min-w-12 text-center text-xs tabular-nums"
            aria-live="polite"
          >
            {fitPage ? "Page" : `${zoom}%`}
          </span>
          <Button
            size="sm"
            variant="outline"
            aria-label="Zoom in"
            disabled={!fitPage && zoom >= 250}
            onClick={() => changeZoom(25)}
          >
            +
          </Button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-auto rounded border bg-muted/50"
          tabIndex={0}
          role="region"
          aria-label={`${block.name} image`}
        >
          <img
            ref={imageRef}
            src={block.url}
            alt={`${block.name} stat block`}
            className={cn(
              "mx-auto block",
              fitPage ? "h-full w-full object-contain" : "h-auto max-w-none",
            )}
            style={fitPage ? undefined : { width: `${zoom}%` }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
