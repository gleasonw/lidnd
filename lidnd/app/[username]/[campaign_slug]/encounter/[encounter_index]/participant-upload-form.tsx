import { Angry, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Suspense, useEffect, useState } from "react";
import * as UploadHooks from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-upload-hooks";
import { creatureUploadSchema } from "@/server/db/schema";
import type { Creature, Encounter } from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Skull } from "lucide-react";
import { observer } from "mobx-react-lite";
import {
  useAddExistingCreatureAsParticipant,
  useEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { AddCreatureButton } from "@/encounters/add-creature-button";
import { z } from "zod";
import { omit } from "remeda";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AllyCreatureUploadForm,
  OppponentCreatureUploadForm,
  useCreatureForm,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";

/**
 * We don't actually upload these, but we want to make sure the user has
 * a stat block image ready before triggering the full upload.
 */
export const localCreatureUploadSchema = creatureUploadSchema.extend({
  statBlockImage: z.instanceof(File),
  iconImage: z.instanceof(File).optional(),
});

function useParticipantForm(role: "ally" | "opponent") {
  const form = useCreatureForm();
  const [encounter] = useEncounter();

  function onSubmit(values: Zod.infer<typeof localCreatureUploadSchema>) {
    const creatureValues = omit(values, ["iconImage", "statBlockImage"]);
    uploadParticipant({
      creature: { ...creatureValues, is_player: false },
      participant: {
        encounter_id: encounter.id,
        //TODO: just use role at some point
        is_ally: role === "ally",
        hp: creatureValues.max_hp,
      },
      hasStatBlock: values.statBlockImage !== undefined,
      hasIcon: values.iconImage !== undefined,
    });
  }

  const { mutate: uploadParticipant, isPending } =
    UploadHooks.useUploadParticipant({
      form,
      onSuccess: () => {
        console.log("upload participant success, reseting form");
        form.reset();
      },
    });

  useEffect(() => {
    console.log(form.formState.errors);
  }, [form.formState.errors]);

  return { form, onSubmit, uploadParticipant, isPending };
}

export function AllyParticipantForm() {
  const { form, onSubmit, isPending } = useParticipantForm("ally");

  return (
    <AllyCreatureUploadForm
      form={form}
      onSubmit={onSubmit}
      isPending={isPending}
    />
  );
}

export function OpponentParticipantForm() {
  const { form, onSubmit, isPending } = useParticipantForm("opponent");

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

export function ExistingMonster({
  onUpload,
}: {
  onUpload?: (creature: Creature) => void;
}) {
  const [name, setName] = useState("");
  const [encounter] = useEncounter();
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    is_player: false,
  });

  return (
    <div className="flex flex-col max-h-full gap-5 ">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col overflow-auto gap-3 py-3"}>
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
}

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

    return (
      <div className="flex h-full flex-col">
        <AddCreatureButton
          creature={creature}
          key={creature.id}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) {
              return onSelect(creature);
            }
            addCreatureToEncounter({
              creature_id: creature.id,
              encounter_id: id,
              is_ally: isAlly ?? false,
            });
          }}
        >
          {creature.challenge_rating ? (
            <span className="grid grid-cols-2 text-gray-500">
              <span className="flex gap-2">
                <Skull />
                {creature.challenge_rating}
              </span>
              <span className="flex gap-2">
                <Heart />
                {creature.max_hp}
              </span>
            </span>
          ) : null}
        </AddCreatureButton>
      </div>
    );
  }
);
