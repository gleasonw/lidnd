"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LidndPlusDialog } from "@/components/ui/lidnd_dialog";
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
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import {
  AllyUpload,
  MonsterUpload,
} from "@/encounters/[encounter_index]/participant-add-form";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { Plus } from "lucide-react";

export function EncounterTopBar() {
  const [encounter] = useEncounter();
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();

  if (encounter.status === "run") {
    return <InitiativeTracker />;
  }

  return (
    <div className="w-full pt-5 flex flex-col gap-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
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
        <Card className="flex flex-col gap-5 items-center">
          <EncounterDifficulty />
        </Card>
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
              <ParticipantsContainer role="monsters">
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
              </ParticipantsContainer>

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
    <div className="flex w-full h-44 items-baseline">
      <Card
        className={clsx(
          {
            "border-blue-500": role === "allies",
            "border-red-500": role === "monsters",
            "shadow-blue-500": role === "allies",
            "shadow-red-500": role === "monsters",
          },
          `flex gap-4 p-5 w-full h-28 items-center shadow-sm`,
        )}
      >
        {children}
      </Card>
    </div>
  );
}

export function EncounterDifficulty() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { mutate, isPending, variables } = useUpdateEncounter();
  const target = isPending
    ? variables.target_difficulty
    : encounter.target_difficulty;
  const totalCr = EncounterUtils.totalCr(encounter);
  const goalCR = EncounterUtils.goalCr(encounter, campaign);
  const remainingBudget = goalCR - totalCr;
  const textColor = EncounterUtils.difficultyColor(encounter, campaign);

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-5">
          <span>Challenge Rating</span>
          <span className="font-normal">
            {totalCr} / {goalCR}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex gap-3 w-full justify-between items-center">
        <label className="flex flex-col gap-3 w-48">
          <span className=" text-slate-500">Target difficulty</span>
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
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <Card
          className={`flex shadow-lg p-3 flex-col items-center justify-center gap-3 text-${textColor}-500`}
        >
          {remainingBudget === 0 ? (
            <span className="text-3xl font-bold">
              {EncounterUtils.difficulty(encounter, campaign?.party_level)}
            </span>
          ) : remainingBudget < 0 ? (
            <span className="text-3xl font-bold">
              {EncounterUtils.difficulty(encounter, campaign?.party_level)}{" "}
              {`(+${totalCr - goalCR})`}
            </span>
          ) : (
            <>
              <span className="text-5xl font-bold">{remainingBudget}</span>
              <span className="text-slate-500">CR budget</span>
            </>
          )}
        </Card>
      </CardContent>
    </>
  );
}
