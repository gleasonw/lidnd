import { cn } from "@/lib/utils";
import { useState } from "react";

/** Text that becomes an input on click. Enter or blur saves; Escape cancels. */
export function InlineText({
  value,
  label,
  onSave,
  className,
  readOnly,
}: {
  value: string;
  label: string;
  onSave: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (readOnly) return <span className={className}>{value}</span>;

  if (draft === null) {
    return (
      <button
        type="button"
        className={cn(
          "-mx-1 rounded px-1 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        title={`Rename (${label.toLowerCase()})`}
        aria-label={`${label}: ${value}. Click to rename`}
        onClick={() => setDraft(value)}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== "" && trimmed !== value) onSave(trimmed);
    setDraft(null);
  };
  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
      }}
      className={cn(
        "-mx-1 min-w-0 rounded bg-transparent px-1 ring-1 ring-ring focus-visible:outline-none",
        className,
      )}
    />
  );
}
