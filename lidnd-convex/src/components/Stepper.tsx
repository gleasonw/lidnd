import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";

/** A number with − and + buttons. Used for party level, victories, malice. */
export function Stepper({
  value,
  min = 1,
  max,
  onChange,
  id,
  label = "party level",
  size = "default",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  id?: string;
  label?: string;
  size?: "default" | "sm";
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  const box = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={box}
        aria-label={`Lower ${label}`}
        disabled={value <= min}
        onClick={() => set(value - 1)}
      >
        <MinusIcon />
      </Button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(next)) set(next);
        }}
        className={cn(
          "rounded-md border border-input bg-transparent text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
          size === "sm" ? "h-7 w-10" : "h-8 w-12",
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={box}
        aria-label={`Raise ${label}`}
        disabled={value >= max}
        onClick={() => set(value + 1)}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
