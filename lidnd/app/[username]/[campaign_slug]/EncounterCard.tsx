"use client";

import { useEncounterLinks } from "@/encounters/link-hooks";
import type { Creature, Encounter, Participant } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { type SortableNameableParticipant } from "@/utils/participants";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { CheckCircle, Radio } from "lucide-react";
import { DifficultyBadge } from "@/encounters/campaign-encounters-overview";
import { Badge } from "@/components/ui/badge";

type EncounterDataForCard = Pick<
  Encounter,
  | "description"
  | "name"
  | "id"
  | "index_in_campaign"
  | "ended_at"
  | "started_at"
> & {
  participants: Array<
    SortableNameableParticipant & {
      creature: Pick<Creature, "icon_width" | "icon_height" | "id">;
      is_ally: Participant["is_ally"];
    }
  >;
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  average_victories: number;
};

export function EncounterCard({
  encounter,
}: {
  encounter: EncounterDataForCard;
}) {
  encounter.participants[0];
  const { encounter: encounterLink } = useEncounterLinks(encounter);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setImageUrl(EncounterUtils.imageUrl(encounter));
  }, [encounter]);

  return (
    <Link
      href={encounterLink}
      className="flex rounded-lg border bg-background shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {imageUrl ? (
        <div className="flex w-full h-full items-center justify-center pl-2">
          <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-md border bg-muted shadow-sm">
            <Image
              src={imageUrl}
              alt={encounter.name || "Encounter image"}
              fill
              className="object-cover"
            />
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1 items-center">
          <DifficultyBadge encounter={encounter} />
        </div>

        <div className="flex gap-2 items-center">
          {encounter.started_at && !encounter.ended_at && (
            <Radio className="h-4 w-4 shrink-0 text-red-500" />
          )}

          {encounter.ended_at && (
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-ellipsis overflow-hidden whitespace-nowrap">
              {encounter.name || "Unnamed encounter"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {encounter.tags.map(({ tag }) => (
            <Badge variant="secondary" key={tag.id}>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
