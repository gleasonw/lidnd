"use client";

import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Spinner } from "@/components/ui/spinner";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export function EncountersSearchBar({ search }: { search?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(search || "");
  const updateSearch = useDebouncedCallback((nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery) {
      params.set("encounterSearch", nextQuery);
    } else {
      params.delete("encounterSearch");
    }

    startTransition(() => {
      router.replace(`?${params.toString()}`);
    });
  }, 300);

  return (
    <div className="relative flex gap-3 items-center">
      <Search className="w-5 h-5 text-gray-400" />
      <LidndTextInput
        variant="ghost"
        value={query}
        placeholder="Search for encounter"
        className="pr-10"
        onChange={(e) => {
          const nextQuery = e.target.value;
          setQuery(nextQuery);
          updateSearch(nextQuery);
        }}
      />
      {isPending ? (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Spinner className="h-4 w-4 text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
