import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { SegmentedControl } from "@/components/SegmentedControl";
import { toastError } from "@/lib/errors";
import {
  imageFromClipboard,
  imagesFromDrop,
  useUploadImage,
} from "@/lib/upload";
import { cn } from "@/lib/utils";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { PlanData } from "./types";

type Kind = "reference" | "statBlock";
type Pending = { id: number; file: File; kind: Kind };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Reference and stat-block images for a plan. Images come from the picker, a
 * drop, or pasting anywhere on the page, and are previewed before attaching.
 */
export function PlanImages({ data }: { data: PlanData }) {
  const addImage = useMutation(api.plans.addImage);
  const removeImage = useMutation(api.plans.removeImage);
  const upload = useUploadImage();
  const [pending, setPending] = useState<Pending[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const queue = (files: File[]) =>
    setPending((p) => [
      ...p,
      ...files.map((file) => ({
        id: nextId.current++,
        file,
        kind: "reference" as Kind,
      })),
    ]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const file = imageFromClipboard(e);
      if (file) {
        e.preventDefault();
        queue([file]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const attachAll = async () => {
    setSaving(true);
    try {
      for (const p of pending) {
        const storageId = await upload(p.file);
        await addImage({ planId: data.plan._id, storageId, kind: p.kind });
        setPending((all) => all.filter((x) => x.id !== p.id));
      }
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  // Stat blocks of adversaries in the roster, once per creature.
  const creatureStatBlocks = [
    ...new Map(
      data.participants
        .filter((p) => p.creature.statBlockUrl)
        .map((p) => [p.creatureId, p.creature]),
    ).values(),
  ];

  return (
    <section aria-labelledby="images-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 id="images-heading" className="text-sm font-semibold">
          Images
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          Add images
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Choose images"
          onChange={(e) => {
            queue(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      <div
        className={cn(
          "rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground",
          dragging && "border-primary bg-accent",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          queue(imagesFromDrop(e));
        }}
      >
        Drop images here, or paste one anywhere on this page (Ctrl+V)
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border bg-accent/40 p-2">
          <p className="text-xs font-medium">Preview before attaching</p>
          <div className="grid grid-cols-2 gap-2">
            {pending.map((p) => (
              <PendingImage
                key={p.id}
                pending={p}
                onKind={(kind) =>
                  setPending((all) =>
                    all.map((x) => (x.id === p.id ? { ...x, kind } : x)),
                  )
                }
                onDiscard={() =>
                  setPending((all) => all.filter((x) => x.id !== p.id))
                }
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPending([])}
              disabled={saving}
            >
              Discard all
            </Button>
            <Button
              size="sm"
              onClick={() => void attachAll()}
              disabled={saving}
            >
              {saving ? "Attaching…" : `Attach ${pending.length}`}
            </Button>
          </div>
        </div>
      )}

      <div className="columns-2 gap-2 [&>*]:mb-2">
        {data.images.map((image) => (
          <figure
            key={image._id}
            className="group relative break-inside-avoid rounded-md border"
          >
            {image.url && (
              <a href={image.url} target="_blank" rel="noreferrer">
                <img
                  src={image.url}
                  alt={
                    image.kind === "statBlock"
                      ? "Stat block"
                      : "Reference image"
                  }
                  className="w-full rounded-md"
                />
              </a>
            )}
            <figcaption className="flex items-center justify-between px-1.5 py-0.5 text-xs text-muted-foreground">
              {image.kind === "statBlock" ? "Stat block" : "Reference"}
              <button
                type="button"
                aria-label="Remove image"
                className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                onClick={() =>
                  void removeImage({ imageId: image._id }).catch(toastError)
                }
              >
                <Cross2Icon />
              </button>
            </figcaption>
          </figure>
        ))}
        {creatureStatBlocks.map((creature) => (
          <figure
            key={creature._id}
            className="break-inside-avoid rounded-md border"
          >
            <a href={creature.statBlockUrl!} target="_blank" rel="noreferrer">
              <img
                src={creature.statBlockUrl!}
                alt={`${creature.name} stat block`}
                className="w-full rounded-md"
              />
            </a>
            <figcaption className="px-1.5 py-0.5 text-xs text-muted-foreground">
              {creature.name} (from the adversary)
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function PendingImage({
  pending,
  onKind,
  onDiscard,
}: {
  pending: Pending;
  onKind: (kind: Kind) => void;
  onDiscard: () => void;
}) {
  const url = useObjectUrl(pending.file);
  return (
    <div className="flex flex-col gap-1 rounded border bg-background p-1">
      {url && (
        <img
          src={url}
          alt="Image to attach"
          className="max-h-40 w-full object-contain"
        />
      )}
      <div className="flex items-center justify-between gap-1">
        <SegmentedControl
          name={`kind-${pending.id}`}
          value={pending.kind}
          options={[
            { value: "reference", label: "Reference" },
            { value: "statBlock", label: "Stat block" },
          ]}
          onChange={onKind}
          size="sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Discard image"
          onClick={onDiscard}
        >
          <Cross2Icon />
        </Button>
      </div>
    </div>
  );
}
