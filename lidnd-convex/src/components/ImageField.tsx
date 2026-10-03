import { Button } from "@/components/ui/button";
import { imagesFromDrop } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { useId, useRef, useState } from "react";

export type ImageValue = { file?: File; url?: string | null };

/**
 * An image slot that takes a file from the picker, a drop, or (via the
 * parent's paste handler) the clipboard, and previews it before saving.
 */
export function ImageField({
  label,
  value,
  onChange,
  className,
  hint,
}: {
  label: string;
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  className?: string;
  hint?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const pendingUrl = useObjectUrl(value.file);
  const src = pendingUrl ?? value.url ?? null;

  return (
    <div className={cn("flex min-h-0 flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        {src && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => onChange({})}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
      <div
        className={cn(
          "relative flex min-h-24 flex-1 items-center justify-center overflow-auto rounded-md border border-dashed",
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
          const [file] = imagesFromDrop(e);
          if (file) onChange({ file });
        }}
      >
        {src ? (
          <img
            src={src}
            alt={label}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground hover:bg-accent"
            onClick={() => inputRef.current?.click()}
          >
            <span>Drop an image, or click to choose</span>
            {hint && <span className="text-xs">{hint}</span>}
          </button>
        )}
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ file });
          e.target.value = "";
        }}
      />
    </div>
  );
}
