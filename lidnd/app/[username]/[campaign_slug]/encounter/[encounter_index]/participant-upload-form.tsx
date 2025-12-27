import { Angry, Plus, PlusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Suspense, useState } from "react";
import type { Creature, Encounter } from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart } from "lucide-react";
import { observer } from "mobx-react-lite";
import {
  useAddExistingCreatureAsParticipant,
  useEncounter,
  useParticipantForm,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AllyCreatureUploadForm,
  OppponentCreatureUploadForm,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { Toggle } from "@/components/ui/toggle";
import { EncounterUtils } from "@/utils/encounters";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { useEncounterUIStore } from "@/encounters/[encounter_index]/EncounterUiStore";
import { crLabel } from "@/utils/campaigns";
import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndLabel } from "@/components/ui/LidndLabel";

export function AllyParticipantForm() {
  const { form, onSubmit, isPending } = useParticipantForm({ role: "ally" });

  return (
    <AllyCreatureUploadForm
      form={form}
      onSubmit={onSubmit}
      isPending={isPending}
    />
  );
}

export function OpponentParticipantForm() {
  const { form, onSubmit, isPending } = useParticipantForm({
    role: "opponent",
  });

  return (
    <Tabs defaultValue="new" className="overflow-auto">
      <span>
        <TabsList>
          <TabsTrigger value="new">
            <Plus /> New opponent
          </TabsTrigger>
          <TabsTrigger value="existing">
            <Angry /> Existing opponent
          </TabsTrigger>
        </TabsList>
      </span>
      <TabsContent value="new">
        <OppponentCreatureUploadForm
          form={form}
          onSubmit={onSubmit}
          isPending={isPending}
        />
      </TabsContent>
      <TabsContent value="existing">
        <ExistingMonster />
      </TabsContent>
    </Tabs>
  );
}

export const ExistingMonster = observer(function ExistingMonster({
  onUpload,
}: {
  onUpload?: (creature: Creature) => void;
}) {
  const [name, setName] = useState("");
  const [filterInCampaign, setFilterInCampaign] = useState(true);
  const [encounter] = useEncounter();
  const uiStore = useEncounterUIStore();
  const [campaign] = useCampaign();
  const crBudget = EncounterUtils.remainingCr(encounter, campaign);

  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    campaignId: filterInCampaign ? encounter.campaign_id : undefined,
    maxCR:
      uiStore.filterExistingCreaturesByCrBudget && crBudget !== "no-players"
        ? crBudget
        : undefined,
  });

  return (
    <div className="flex flex-col max-h-full gap-5 w-full ">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <span>Cr budget: {crBudget}</span>
      <div className="flex gap-2">
        <Toggle
          variant="outline"
          onPressedChange={uiStore.toggleFilterCreaturesByCrBudget}
          pressed={uiStore.filterExistingCreaturesByCrBudget}
          className="data-[state=on]:bg-gray-200"
        >
          In CR budget
        </Toggle>
        <Toggle
          variant="outline"
          onPressedChange={() => setFilterInCampaign(!filterInCampaign)}
          pressed={filterInCampaign}
          className="data-[state=on]:bg-gray-200"
        >
          In Campaign
        </Toggle>
      </div>
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"grid sm:grid-cols-2 overflow-auto gap-6"}>
          {creatures?.map((creature) => (
            <ListedCreature
              key={creature.id}
              creature={creature}
              encounter={encounter}
              onSelect={onUpload}
            />
          ))}
        </div>
      </Suspense>
    </div>
  );
});

export interface ListedCreatureProps {
  creature: Creature;
  encounter: Encounter;
  onSelect?: (creature: Creature) => void;
}

export const ListedCreature = observer<ListedCreatureProps>(
  function ListedCreature({ creature, encounter, onSelect }) {
    const { mutate: addCreatureToEncounter } =
      useAddExistingCreatureAsParticipant(encounter);
    // todo figure out a better way
    const isAlly = false;
    const id = encounter.id;
    const [campaign] = useCampaign();
    const [overrideMaxHp, setOverrideMaxHp] = useState<string | undefined>(
      undefined
    );

    return (
      <div className="flex gap-2">
        <Button
          key={creature.id}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) {
              return onSelect(creature);
            }
            const maxHpAsNumber =
              overrideMaxHp && !isNaN(Number(overrideMaxHp))
                ? Number(overrideMaxHp)
                : undefined;
            addCreatureToEncounter({
              creature_id: creature.id,
              encounter_id: id,
              is_ally: isAlly ?? false,
              max_hp_override: maxHpAsNumber,
              hp: maxHpAsNumber || creature.max_hp,
            });
          }}
          variant="secondary"
          className="p-2"
        >
          <PlusIcon />
        </Button>
        <div className="flex items-start justify-start gap-3">
          <CreatureIcon creature={creature} size="small" />
          <div className="flex flex-col w-36">
            <span className="truncate ">{creature.name}</span>
            {creature.challenge_rating ? (
              <span className="flex text-gray-500 gap-4 items-center">
                <span className="flex gap-2">
                  <span>{crLabel(campaign)}</span>
                  <span>{creature.challenge_rating}</span>
                </span>
                <span className="flex gap-2">
                  <Heart className="inline-block h-5 w-5" />
                  <span>{creature.max_hp}</span>
                </span>
              </span>
            ) : null}
          </div>
          <div className="ml-auto">
            <LidndLabel label="Encounter override">
              <LidndTextInput
                placeholder="HP"
                type="number"
                variant="ghost"
                className="w-16 h-6"
                value={overrideMaxHp ?? ""}
                onChange={(e) => {
                  setOverrideMaxHp(e.target.value);
                }}
              />
            </LidndLabel>
          </div>
        </div>
      </div>
    );
  }
);
