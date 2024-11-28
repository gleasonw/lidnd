"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LidndDialog, LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { InitiativeTracker } from "@/encounters/[encounter_index]/battle-bar";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { GroupInitiativeInput } from "@/encounters/[encounter_index]/group-initiative-input";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import {
  AllyUpload,
  MonsterUpload,
} from "@/encounters/[encounter_index]/participant-add-form";
import { LidndPopover } from "@/encounters/base-popover";
import { DifficultyBadge } from "@/encounters/campaign-encounters-overview";
import type { EncounterWithParticipants } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { HelpCircle, Plus, Swords } from "lucide-react";

export function EncounterTopBar() {
  const [encounter] = useEncounter();
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();

  if (encounter.status === "run") {
    return <InitiativeTracker />;
  }

  return (
    <div className="w-full py-5 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-5">
        <ParticipantsContainer role="allies">
          {EncounterUtils.allies(encounter).map((p) => (
            <button
              onClick={() =>
                removeParticipant({
                  participant_id: p.id,
                  encounter_id: encounter.id,
                })
              }
              key={p.id}
              className="w-20 h-20"
            >
              <CreatureIcon creature={p.creature} size="small2" />
            </button>
          ))}
          <LidndPlusDialog text="Add ally">
            <AllyUpload encounter={encounter} />
          </LidndPlusDialog>
        </ParticipantsContainer>
        <div className=" flex flex-col gap-3 items-center">
          <LidndDialog
            title={"Roll initiative"}
            trigger={
              <Button className="w-full h-full max-w-sm text-xl flex gap-3 py-5 shadow-lg">
                <Swords />
                Roll initiative
                <Swords />
              </Button>
            }
            content={<GroupInitiativeInput />}
          />

          <EncounterDifficulty encounter={encounter} />
        </div>
        <ParticipantsContainer role="monsters">
          {EncounterUtils.monsters(encounter).map((p) => (
            <button
              onClick={() =>
                removeParticipant({
                  participant_id: p.id,
                  encounter_id: encounter.id,
                })
              }
              className="w-20 h-20"
              key={p.id}
            >
              <CreatureIcon creature={p.creature} size="small2" />
            </button>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <ButtonWithTooltip text="Add monster" variant="ghost">
                <Plus />
              </ButtonWithTooltip>
            </DialogTrigger>
            <DialogContent className="max-h-screen overflow-auto sm:max-w-[800px]">
              <DialogTitle>
                <div className="flex gap-5 items-center">
                  Add monster
                  <DifficultyBadge encounter={encounter} />
                </div>
              </DialogTitle>
              <div className="flex -space-x-2">
                {encounter?.participants
                  ?.filter((p) => !ParticipantUtils.isPlayer(p))
                  .map((p) => (
                    <ButtonWithTooltip
                      className="p-0 h-20 w-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white bg-white"
                      key={p.id}
                      variant="ghost"
                      onClick={() =>
                        removeParticipant({
                          participant_id: p.id,
                          encounter_id: encounter.id,
                        })
                      }
                      text={`Remove ${p.creature.name}`}
                    >
                      <CreatureIcon creature={p.creature} size="small" />
                    </ButtonWithTooltip>
                  ))}
              </div>
              <MonsterUpload encounter={encounter} />
            </DialogContent>
            <DialogOverlay />
          </Dialog>
        </ParticipantsContainer>
      </div>
    </div>
  );
}

function ParticipantsContainer({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "allies" | "monsters";
}) {
  return (
    <div
      className={clsx(
        {
          "border-blue-500": role === "allies",
          "border-red-500": role === "monsters",
        },
        `flex gap-4 px-5  items-center border-4 shadow-md`,
      )}
    >
      {children}
    </div>
  );
}

export function EncounterDifficulty({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  const [campaign] = useCampaign();

  const totalCr = EncounterUtils.totalCr(encounter);

  const { hardTier, standardTier, easyTier } = EncounterUtils.findCRBudget(
    encounter,
    campaign?.party_level ?? 1,
  );

  const percentFull = Math.min(1, totalCr / hardTier);
  const easyCutoff = (easyTier / hardTier) * 100;
  const standardCutoff = (standardTier / hardTier) * 100;

  const tiers = [totalCr, hardTier, standardTier, easyTier].sort();
  const nextTierIndex = tiers.findIndex((t) => t === totalCr) + 1;
  const nextTier =
    nextTierIndex > tiers.length - 1
      ? tiers[tiers.length - 1]
      : tiers[nextTierIndex];
  // why 0? doesn't really make sense
  const distanceToNext = nextTier ? nextTier - totalCr : 0;

  return (
    <div className="flex flex-col gap-3 pb-8 w-full">
      <span className="flex justify-between">
        <span className="text-sm">Challenge rating budget</span>
        <span className="flex gap-2 items-center text-sm text-gray-700">
          <span className=" flex gap-2 items-center">
            CR to next: {distanceToNext}
          </span>
          <LidndPopover
            trigger={
              <ButtonWithTooltip text="info" variant="ghost">
                <HelpCircle className="h-4 w-4" />
              </ButtonWithTooltip>
            }
          >
            hello
          </LidndPopover>
        </span>
      </span>
      <div className="border h-3 rounded-full relative flex items-start w-full">
        <div
          className={clsx(
            `bg-${EncounterUtils.difficultyColor(encounter, campaign)}-500 absolute top-0 left-0 h-full transition-all rounded-full`,
          )}
          style={{ width: `${percentFull * 100}%` }}
        />
        <span style={{ left: "0%" }} className="absolute w-1 h-full">
          <span className="absolute bottom-0 translate-y-full pt-3">Easy</span>
        </span>
        <span
          className={`border w-1 h-full absolute  bg-green-500`}
          style={{ left: `${easyCutoff}%` }}
        >
          <span className="absolute bottom-0 translate-y-full -translate-x-1/2 pt-3">
            {standardTier}
          </span>
        </span>
        <span
          className={`border w-1 h-full absolute bg-yellow-500`}
          style={{ left: `${standardCutoff}%` }}
        >
          <span className="absolute bottom-0 translate-y-full -translate-x-1/2 pt-3">
            {hardTier}
          </span>
        </span>
        <span style={{ left: "100%" }} className="w-1 h-full absolute ">
          <span className="absolute bottom-0 translate-y-full -translate-x-full pt-3">
            Deadly
          </span>
        </span>
      </div>
    </div>
  );
}
