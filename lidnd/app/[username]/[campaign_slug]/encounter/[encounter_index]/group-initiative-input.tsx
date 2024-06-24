"use client";

import { FadePresenceItem } from "@/components/ui/animate/FadePresenceItem";
import { Button } from "@/components/ui/button";
import { ParticipantWithData } from "@/server/api/router";
import { api } from "@/trpc/react";
import { ParticipantUtils } from "@/utils/participants";
import { AnimatePresence } from "framer-motion";
import { Swords, Zap } from "lucide-react";
import Link from "next/link";
import { appRoutes } from "@/app/routes";
import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { useUser } from "@/app/[username]/user-provider";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import { useStartEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import InitiativeInput from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/InitiativeInput";

export function GroupInitiativeInput() {
  const id = useEncounterId();

  const [encounter] = api.encounterById.useSuspenseQuery(id);
  const [campaign] = useCampaign();
  const user = useUser();
  const { mutate: startEncounter } = useStartEncounter();
  return (
    <AnimatePresence>
      <FadePresenceItem className="flex flex-col gap-10 items-center">
        <div className="flex justify-between gap-10">
          <Link href={appRoutes.encounter(campaign, encounter, user)}>
            <Button variant="ghost">Back to prep</Button>
          </Link>
          <Link href={`surprise`}>
            <Button variant="outline">
              <Zap />
              Assign surprise
            </Button>
          </Link>
          <Link href={`run`} onClick={() => encounter && startEncounter(id)}>
            <Button>
              <Swords />
              Commence the battle
            </Button>
          </Link>
        </div>
        <PreBattleInputsList>
          {encounter.participants
            .toSorted(ParticipantUtils.sortLinearly)
            .map((participant) => (
              <PreBattleInput key={participant.id} participant={participant}>
                <InitiativeInput participant={participant} />
              </PreBattleInput>
            ))}
        </PreBattleInputsList>
      </FadePresenceItem>
    </AnimatePresence>
  );
}

export function PreBattleInputsList({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={"flex flex-col gap-2 max-w-2xl"}>{children}</div>;
}

export function PreBattleInput({
  children,
  participant,
}: {
  children: React.ReactNode;
  participant: ParticipantWithData;
}) {
  const pName = ParticipantUtils.name(participant);
  return (
    <div
      key={participant.id}
      className="flex gap-20 items-center justify-between"
    >
      <span className="flex gap-4 items-center">
        <CharacterIcon
          name={pName}
          id={participant.creature_id}
          className={"h-20 object-cover"}
        />
        <span>{pName}</span>
      </span>

      {children}
    </div>
  );
}
