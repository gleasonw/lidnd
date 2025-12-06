"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
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

export function EncounterDifficulty() {
  const [campaign] = useCampaign();
  const [encounter] = useEncounter();
  const { mutate, isPending, variables } = useUpdateEncounter();
  const target = isPending
    ? variables.target_difficulty
    : encounter.target_difficulty;

  return (
    <>
      <label className="">
        <span className="whitespace-nowrap">Goal difficulty</span>
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
      {campaign.system === "drawsteel" && (
        <label>
          <span>Average victories</span>
          <LidndTextInput
            type="number"
            placeholder="0"
            className="w-28"
            value={encounter.average_victories ?? ""}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              mutate({
                ...encounter,
                average_victories: isNaN(value) ? null : value,
              });
            }}
          />
        </label>
      )}
    </>
  );
}
