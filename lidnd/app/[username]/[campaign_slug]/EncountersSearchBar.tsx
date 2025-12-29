"use client";

import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { useRouter, useSearchParams } from "next/navigation";

export function EncountersSearchBar({ search }: { search?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  return (
    <LidndTextInput
      value={search || ""}
      placeholder="Search for encounter"
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("encounterSearch", e.target.value);
        router.replace(`?${params.toString()}`);
      }}
    />
  );
}
