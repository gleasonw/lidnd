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
  const status = encounter.started_at && !encounter.ended_at
    ? {
        Icon: Radio,
        label: "In progress",
        iconClassName: "text-red-500",
      }
    : encounter.ended_at
      ? {
          Icon: CheckCircle,
          label: "Completed",
          iconClassName: "text-green-600",
        }
      : null;

  React.useEffect(() => {
    setImageUrl(EncounterUtils.imageUrl(encounter));
  }, [encounter]);

  return (
    <Link
      href={encounterLink}
      className="flex overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex w-full flex-col gap-3 p-4">
        <div className="flex min-h-16 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="min-h-[3.5rem] line-clamp-2 text-lg font-semibold leading-tight tracking-tight">
              {encounter.name || "Unnamed encounter"}
            </p>
          </div>
          {imageUrl ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
              <Image
                src={imageUrl}
                alt={encounter.name || "Encounter image"}
                fill
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge encounter={encounter} />
          {status ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <status.Icon className={`h-3.5 w-3.5 shrink-0 ${status.iconClassName}`} />
              <span>{status.label}</span>
            </div>
          ) : null}
        </div>

        {encounter.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {encounter.tags.map(({ tag }) => (
              <Badge
                variant="outline"
                key={tag.id}
                className="border-border/70 bg-muted/20 px-2 py-0 text-[11px] font-medium text-muted-foreground"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
