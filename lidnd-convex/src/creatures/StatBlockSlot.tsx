import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { toastError } from "@/lib/errors";
import {
  imageFromClipboard,
  imagesFromDrop,
  useUploadImage,
} from "@/lib/upload";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

/**
 * A creature's stat block in a list row: a thumbnail when set, otherwise an
 * "Add stat block" target. Drop, pick, or paste (while focused) an image,
 * preview it, then attach.
 */
export function StatBlockSlot({
  name,
  url,
  onAttach,
  onRemove,
  className,
}: {
  name: string;
  url: string | null;
  onAttach: (storageId: Id<"_storage">) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
  className?: string;
}) {
  const upload = useUploadImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [viewing, setViewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pendingUrl = useObjectUrl(pending ?? undefined);

  const attach = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onAttach(await upload(pending));
      setPending(null);
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const [file] = imagesFromDrop(e);
      if (file) setPending(file);
    },
    onPaste: (e: React.ClipboardEvent) => {
      const file = imageFromClipboard(e);
      if (file) {
        e.preventDefault();
        setPending(file);
      }
    },
  };

  return (
    <Popover
      open={pending !== null || viewing}
      onOpenChange={(open) => {
        if (!open) {
          setPending(null);
          setViewing(false);
        }
      }}
    >
      <PopoverAnchor asChild>
        {url ? (
          <button
            type="button"
            title={`${name} stat block. Click to view or replace; drop an image to replace`}
            aria-label={`${name} stat block`}
            className={cn(
              "h-9 w-7 shrink-0 overflow-hidden rounded border bg-muted hover:ring-1 hover:ring-ring",
              dragging && "ring-2 ring-primary",
              className,
            )}
            onClick={() => setViewing(true)}
            {...dropProps}
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          </button>
        ) : (
          <button
            type="button"
            title="Drop, paste, or choose a stat block image"
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded border border-dashed border-amber-500 px-2 text-xs text-amber-700 hover:bg-accent dark:text-amber-400",
              dragging && "border-primary bg-accent",
              className,
            )}
            onClick={() => inputRef.current?.click()}
            {...dropProps}
          >
            Needs stat block
          </button>
        )}
      </PopoverAnchor>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Choose a stat block for ${name}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setViewing(false);
            setPending(file);
          }
          e.target.value = "";
        }}
      />
      <PopoverContent align="start" className="flex w-96 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {pending ? `Stat block for ${name}` : `${name} stat block`}
          </p>
          <div className="flex shrink-0 gap-2">
            {pending ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPending(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void attach()}
                  disabled={saving}
                >
                  {saving ? "Attaching…" : url ? "Replace" : "Attach"}
                </Button>
              </>
            ) : (
              <>
                {onRemove && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setViewing(false);
                      onRemove().catch(toastError);
                    }}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace…
                </Button>
              </>
            )}
          </div>
        </div>
        {(pendingUrl ?? url) && (
          <img
            src={pendingUrl ?? url ?? undefined}
            alt={`${name} stat block`}
            className="max-h-[50vh] w-full rounded border object-contain"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
