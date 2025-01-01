"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { EncounterUtils } from "@/utils/encounters";

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
  const difficultyClasses = EncounterUtils.difficultyCssClasses(
    encounter,
    campaign
  );

  return (
    <div className={`flex gap-3 w-full`}>
      <div className={`flex flex-col w-full gap-3`}>
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

        <div
          className={`flex p-3 flex-col items-center justify-center gap-3 ${difficultyClasses}`}
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
        </div>
      </div>
    </div>
  );
}
