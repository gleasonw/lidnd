"use client";

import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function CampaignCreatureSearch({
  defaultValue,
}: {
  defaultValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <div className="relative max-w-sm">
      <Input
        type="text"
        placeholder="Search creatures..."
        defaultValue={defaultValue}
        onChange={(e) => updateSearch(e.target.value)}
        className={isPending ? "opacity-50" : ""}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}
