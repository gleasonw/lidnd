"use client";

import { useEncounterLinks } from "@/encounters/link-hooks";
import type { Creature, Encounter } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import {
  ParticipantUtils,
  type SortableNameableParticipant,
} from "@/utils/participants";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useEffect } from "react";
import { CheckCircle, Radio } from "lucide-react";

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
    }
  >;
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
};

const maxMonstersToShow = 2;

export function EncounterCard({
  encounter,
}: {
  encounter: EncounterDataForCard;
}) {
  const { encounter: encounterLink } = useEncounterLinks(encounter);
  const monstersByCr = EncounterUtils.monstersInCrOrder(encounter);
  const monstersNotShown = Math.max(0, monstersByCr.length - maxMonstersToShow);
  const [onlyClientImageUrl, setOnlyClientImageUrl] = React.useState<
    string | null
  >(null);

  useEffect(() => {
    setOnlyClientImageUrl(EncounterUtils.imageUrl(encounter));
  }, [encounter]);

  return (
    <Link
      href={encounterLink}
      className="flex flex-col gap-3 rounded-lg border bg-background shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {onlyClientImageUrl && (
        <div className="relative w-full h-32 bg-muted">
          <Image
            src={onlyClientImageUrl}
            alt="Encounter Image"
            fill
            className="object-cover"
          />
          {encounter.started_at && !encounter.ended_at && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Radio className="w-4 h-4 text-red-500" />
            </div>
          )}
          {encounter.ended_at && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium flex-1">
            {encounter.name || "Unnamed encounter"}
          </p>
          {!onlyClientImageUrl && encounter.started_at && !encounter.ended_at && (
            <Radio className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          {!onlyClientImageUrl && encounter.ended_at && (
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          )}
        </div>
        
        {encounter.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {encounter.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1 text-muted-foreground">
          {monstersByCr.slice(0, maxMonstersToShow).map((participant) => (
            <span
              key={participant.id}
              className="flex items-center gap-2 text-sm"
            >
              {ParticipantUtils.name(participant)}
            </span>
          ))}
          {monstersNotShown > 0 ? (
            <span className="text-sm text-muted-foreground">
              and {monstersNotShown} more...
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
