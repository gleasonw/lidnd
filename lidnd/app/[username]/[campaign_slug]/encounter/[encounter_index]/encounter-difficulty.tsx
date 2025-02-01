"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
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
  const remainingBudget = EncounterUtils.remainingCr(encounter, campaign);
  const difficulty = EncounterUtils.difficulty(
    encounter,
    campaign?.party_level
  );
  return (
    <>
      <label className="flex gap-3 items-baseline">
        <span className="whitespace-nowrap">Goal difficulty is</span>
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
        className={`flex p-4 flex-col items-center justify-center gap-3 mx-auto bg-gray-200 rounded-md`}
      >
        {remainingBudget === 0 ? (
          <span className="text-2xl font-bold">{difficulty}</span>
        ) : remainingBudget < 0 ? (
          <span className="text-2xl font-bold flex flex-col">
            <span>{difficulty} </span>
            <span>{`(+${remainingBudget})`}</span>
          </span>
        ) : (
          <div className="flex gap-3 items-baseline">
            <span className="text-2xl font-bold">{remainingBudget}</span>
            <span className="text-sm">CR to spend</span>
          </div>
        )}
      </div>
    </>
  );
}
