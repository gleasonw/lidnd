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

type EncounterDataForCard = Pick<
  Encounter,
  "description" | "name" | "id" | "index_in_campaign"
> & {
  participants: Array<
    SortableNameableParticipant & {
      creature: Pick<Creature, "icon_width" | "icon_height" | "id">;
    }
  >;
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
      className="flex flex-col gap-4 rounded-lg border bg-background p-4 shadow-sm"
    >
      <div className="flex flex-col gap-2 hover:bg-gray-10">
        <div className="flex gap-3 items-start">
          {onlyClientImageUrl ? (
            <Image
              src={onlyClientImageUrl}
              alt="Encounter Image"
              width={50}
              height={50}
              className="rounded flex-shrink-0 transition-opacity duration-200"
              style={{ opacity: onlyClientImageUrl ? 1 : 0 }}
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gray-200 flex-shrink-0" />
          )}
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-base">{encounter.name || "Unnamed encounter"}</p>
            {/* <DifficultyBadge encounter={encounterData} /> */}
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
        </div>
      </div>
    </Link>
  );
}
