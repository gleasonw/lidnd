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
import { CheckCircle, Radio, SwordsIcon } from "lucide-react";

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
          <div className="relative flex-shrink-0">
            {onlyClientImageUrl ? (
              <Image
                src={onlyClientImageUrl}
                alt="Encounter Image"
                width={50}
                height={50}
                className="rounded transition-opacity duration-200"
                style={{ opacity: onlyClientImageUrl ? 1 : 0 }}
              />
            ) : (
              <SwordsIcon className="w-12 h-12 rounded text-gray-600" />
            )}
            {encounter.started_at && !encounter.ended_at && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-red-500" />
              </div>
            )}
            {encounter.ended_at && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base">
                {encounter.name || "Unnamed encounter"}
              </p>
            </div>
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
