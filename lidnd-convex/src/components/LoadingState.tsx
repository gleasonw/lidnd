import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Avoid flashing a loading label for requests that finish quickly. */
export function LoadingState({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timeout);
  }, []);

  return visible ? (
    <p role="status" className={cn("text-sm text-muted-foreground", className)}>
      Loading…
    </p>
  ) : null;
}
