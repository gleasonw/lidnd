import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COLORS = [
  { hex: "#dc2626", name: "Red" },
  { hex: "#ea580c", name: "Orange" },
  { hex: "#ca8a04", name: "Yellow" },
  { hex: "#16a34a", name: "Green" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#9333ea", name: "Purple" },
];

/** An initiative group's color label. Always shown next to the group's name. */
export function TurnGroupDot({
  color,
  className,
}: {
  color: string | undefined;
  className?: string;
}) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}

export function TurnGroupColorPicker({
  name,
  color,
  onChange,
}: {
  name: string;
  color: string | undefined;
  onChange: (color: string | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Color for ${name}`}
          title="Label color"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border hover:ring-1 hover:ring-ring"
          style={color ? { backgroundColor: color } : undefined}
        >
          {!color && (
            <span className="text-[10px] text-muted-foreground">+</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto gap-1.5 p-2">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            aria-label={c.name}
            aria-pressed={color === c.hex}
            className={cn(
              "h-6 w-6 rounded-full border",
              color === c.hex && "ring-2 ring-ring ring-offset-1",
            )}
            style={{ backgroundColor: c.hex }}
            onClick={() => onChange(c.hex)}
          />
        ))}
        <button
          type="button"
          className="ml-1 rounded px-1.5 text-xs text-muted-foreground hover:bg-accent"
          onClick={() => onChange(undefined)}
        >
          None
        </button>
      </PopoverContent>
    </Popover>
  );
}
