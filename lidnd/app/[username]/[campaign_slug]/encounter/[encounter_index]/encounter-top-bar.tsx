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
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { InitiativeTracker } from "@/encounters/[encounter_index]/battle-bar";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { GroupInitiativeInput } from "@/encounters/[encounter_index]/group-initiative-input";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import {
  AllyUpload,
  MonsterUpload,
} from "@/encounters/[encounter_index]/participant-add-form";
import type { EncounterWithParticipants } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { Plus, Swords } from "lucide-react";

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
        <div className=" flex flex-col gap-5 items-center">
          <LidndDialog
            title={"Roll initiative"}
            trigger={
              <Button className="w-full h-full max-w-sm text-xl flex gap-3 py-4 shadow-lg">
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
                <div className="flex gap-5 items-center">Add monster</div>
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
  const { mutate, isPending, variables } = useUpdateEncounter();
  const target = isPending
    ? variables.target_difficulty
    : encounter.target_difficulty;

  const totalCr = EncounterUtils.totalCr(encounter);
  const partyLevel = campaign?.party_level ?? 1;

  const { hardTier, standardTier, easyTier } = EncounterUtils.findCRBudget(
    encounter,
    partyLevel,
  );

  const remainingBudget =
    target === "easy"
      ? easyTier - totalCr
      : target === "standard"
        ? standardTier - totalCr
        : hardTier - totalCr;

  const textColor = EncounterUtils.colorForDifficulty(
    target === "easy" ? "Easy" : target === "standard" ? "Standard" : "Hard",
  );

  return (
    <div className="flex flex-col gap-3 pb-8 w-full">
      <span
        className={`flex h-24 flex-col items-center justify-center p-3 gap-3 text-${textColor}-500`}
      >
        {remainingBudget === 0 ? (
          <span className="text-3xl font-bold">
            {EncounterUtils.difficulty(encounter, campaign?.party_level)}
          </span>
        ) : (
          <>
            <span className="text-7xl font-bold">{remainingBudget}</span>
            <span className="text-slate-500">CR remaining</span>
          </>
        )}
      </span>
      <span className="grid grid-cols-2 justify-between items-center">
        <label className="flex flex-col gap-3">
          <span className=" text-slate-500">Target</span>
          <Select
            onValueChange={(v) => {
              console.log(v);
              mutate({ ...encounter, target_difficulty: v as any });
            }}
            defaultValue={target}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy {`(${easyTier})`}</SelectItem>
              <SelectItem value="standard">
                Standard {`(${standardTier})`}
              </SelectItem>
              <SelectItem value="hard">Hard {`(${hardTier})`}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <span className="whitespace-nowrap flex flex-col gap-3 items-center justify-between text-slate-500">
          <span>Current</span>
          <span className={`font-bold text-xl text-${textColor}-500`}>
            {totalCr}
          </span>
        </span>
      </span>
    </div>
  );
}
