"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { Button } from "@/components/ui/button";
import { LidndDialog, LidndPlusDialog } from "@/components/ui/lidnd_dialog";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { EncounterReminderInput } from "@/encounters/[encounter_index]/encounter-prep";
import { GroupInitiativeInput } from "@/encounters/[encounter_index]/group-initiative-input";
import {
  useEncounter,
  useRemoveParticipantFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import {
  AllyUpload,
  MonsterUpload,
} from "@/encounters/[encounter_index]/participant-add-form";
import { EncounterUtils } from "@/utils/encounters";
import clsx from "clsx";
import { Swords } from "lucide-react";

export function EncounterPrepBar() {
  const [encounter] = useEncounter();
  const { mutate: removeParticipant } = useRemoveParticipantFromEncounter();

  if (encounter.status === "run") {
    return null;
  }

  return (
    <div className="w-full p-10 flex flex-col gap-5">
      <div className="grid grid-cols-3">
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
            <AllyUpload />
          </LidndPlusDialog>
        </ParticipantsContainer>
        <div className="p-5 flex flex-col gap-3 items-center">
          <LidndDialog
            trigger={
              <Button className="w-full h-full max-w-sm text-xl flex flex-col gap-3">
                Roll initiative
                <Swords />
              </Button>
            }
            content={<GroupInitiativeInput />}
          />

          <EncounterDifficulty />
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
          <LidndPlusDialog text="Add monster">
            <MonsterUpload />
          </LidndPlusDialog>
        </ParticipantsContainer>
      </div>
      <EncounterReminderInput />
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
        `flex flex-wrap gap-4 p-5  items-center border-4 shadow-md`,
      )}
    >
      {children}
    </div>
  );
}

function EncounterDifficulty() {
  const [encounter] = useEncounter();

  const [campaign] = useCampaign();

  const totalCr = EncounterUtils.totalCr(encounter);

  const { hardTier } = EncounterUtils.findCRBudget(
    encounter,
    campaign?.party_level ?? 1,
  );
  const difficulty = EncounterUtils.difficulty(
    encounter,
    campaign?.party_level,
  );

  const percentFull = Math.min(1, totalCr / hardTier);

  return (
    <div className="w-full max-w-sm">
      <div className="border rounded h-10 relative">
        <div
          className={clsx(
            {
              "bg-green-500": difficulty === "Easy",
              "bg-yellow-500": difficulty === "Standard",
              "bg-red-500": difficulty === "Hard",
              "bg-gray-500": difficulty === "Deadly",
            },
            `absolute top-0 left-0 h-full transition-all`,
          )}
          style={{ width: `${percentFull * 100}%` }}
        />
      </div>
      {difficulty}
    </div>
  );
}
