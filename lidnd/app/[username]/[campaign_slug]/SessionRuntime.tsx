"use client";

import { Clock3Icon } from "lucide-react";
import { useEffect, useState } from "react";

function formatSessionRuntime(startedAt: Date | string | null) {
  if (!startedAt) {
    return null;
  }

  const start = new Date(startedAt);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - start.getTime());
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function SessionRuntime({
  startedAt,
}: {
  startedAt: Date | string | null;
}) {
  const [runtime, setRuntime] = useState(() => formatSessionRuntime(startedAt));

  useEffect(() => {
    const updateRuntime = () => {
      setRuntime(formatSessionRuntime(startedAt));
    };

    updateRuntime();
    const interval = window.setInterval(updateRuntime, 600000);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  if (!runtime) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
      <Clock3Icon className="size-4" />
      <span>{runtime}</span>
    </div>
  );
}
