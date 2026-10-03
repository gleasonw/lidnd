import { cn } from "@/lib/utils";
import { CheckIcon } from "@radix-ui/react-icons";

// Native radio inputs styled as buttons: Tab focuses the group and arrow keys
// change the selection, like any radio group.
export function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  "aria-labelledby": labelledBy,
  size = "default",
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  "aria-labelledby"?: string;
  size?: "default" | "sm";
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex gap-1">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md border font-medium shadow-sm transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1",
              size === "sm" ? "h-6 px-2 text-xs" : "h-8 px-3 text-sm",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {checked && <CheckIcon aria-hidden />}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
