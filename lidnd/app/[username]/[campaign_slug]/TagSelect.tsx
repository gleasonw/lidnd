"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";

export function EncounterTagFilter() {
  const { data: tags } = api.getUserTags.useQuery();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedTag = searchParams.get("tagId");
  function onSelectTag(tagId: string | null) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (tagId) {
      params.set("tagId", tagId);
    } else {
      params.delete("tagId");
    }
    router.replace(`?${params.toString()}`);
  }
  const selectedTagFullData = tags?.find((t) => t.id === selectedTag);
  return (
    <div className="flex gap-2">
      <Select
        value={selectedTag ?? "no-tag"}
        onValueChange={(val) => {
          if (val === "no-tag" || val === selectedTag) {
            onSelectTag(null);
          } else {
            onSelectTag(val);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue>
            {selectedTagFullData ? selectedTagFullData.name : "Filter by tag"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tags?.map((tag) => (
            <SelectItem key={tag.id} value={tag.id}>
              {tag.name}
            </SelectItem>
          ))}
          <SelectItem key="no-tag" value={"no-tag"}>
            Clear
          </SelectItem>
        </SelectContent>
      </Select>
      <ButtonWithTooltip
        variant="outline"
        disabled={!selectedTag}
        text="Clear tag filter"
        onClick={() => onSelectTag(null)}
      >
        ×
      </ButtonWithTooltip>
    </div>
  );
}
