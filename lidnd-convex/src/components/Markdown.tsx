import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}

/** Rendered Markdown; click Edit (or the text) to change it. Saves on blur. */
export function MarkdownNotes({
  value,
  onSave,
  readOnly,
  placeholder = "No notes yet.",
  label = "Notes",
}: {
  value: string;
  onSave: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft !== null) {
    const commit = () => {
      if (draft !== value) onSave(draft);
      setDraft(null);
    };
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          autoFocus
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft(null);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          className="min-h-48 font-mono text-xs"
          placeholder="Markdown: **bold**, - lists, ## headings"
        />
        <p className="text-xs text-muted-foreground">
          Markdown. Saves when you click away or press Ctrl+Enter; Escape
          cancels.
        </p>
      </div>
    );
  }

  return (
    <div className="group relative">
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-6 px-2 opacity-60 group-hover:opacity-100"
          onClick={() => setDraft(value)}
        >
          Edit
        </Button>
      )}
      {value.trim() === "" ? (
        <p className="text-sm text-muted-foreground">
          {readOnly ? (
            placeholder
          ) : (
            <button
              className="underline-offset-4 hover:underline"
              onClick={() => setDraft(value)}
            >
              Add notes…
            </button>
          )}
        </p>
      ) : (
        <Markdown source={value} className="pr-12" />
      )}
    </div>
  );
}
