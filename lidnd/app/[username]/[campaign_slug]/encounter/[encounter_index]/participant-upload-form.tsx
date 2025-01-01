import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "../image-upload";
import { FileText, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Suspense, useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as UploadHooks from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-upload-hooks";
import { FormField } from "@/components/ui/form";
import { creatureUploadSchema } from "@/server/db/schema";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Creature,
  Encounter,
  EncounterWithParticipants,
} from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Skull } from "lucide-react";
import { observer } from "mobx-react-lite";
import {
  useAddExistingCreatureAsParticipant,
  useEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { AddCreatureButton } from "@/encounters/add-creature-button";
import { EncounterDifficulty } from "@/encounters/[encounter_index]/encounter-top-bar";
import { z } from "zod";
import { omit } from "remeda";

export function AllyUploadForm() {
  return (
    <>
      <DmCreatureForm />
    </>
  );
}

/**
 * We don't actually upload these, but we want to make sure the user has
 * a stat block image ready before triggering the full upload.
 */
const localCreatureUploadSchema = creatureUploadSchema.extend({
  statBlockImage: z.instanceof(File),
  iconImage: z.instanceof(File).optional(),
});

export function DmCreatureForm() {
  const form = useForm<Zod.infer<typeof localCreatureUploadSchema>>({
    resolver: zodResolver(localCreatureUploadSchema),
    defaultValues: {
      name: "",
      is_player: false,
    },
    resetOptions: {
      keepValues: false,
    },
  });
  const [encounter] = useEncounter();

  function onSubmit(values: Zod.infer<typeof localCreatureUploadSchema>) {
    const creatureValues = omit(values, ["iconImage", "statBlockImage"]);
    uploadCreature({
      creature: { ...creatureValues, is_player: false },
      participant: {
        encounter_id: encounter.id,
        is_ally: false,
        hp: creatureValues.max_hp,
      },
      hasStatBlock: values.statBlockImage !== undefined,
      hasIcon: values.iconImage !== undefined,
    });
  }

  const { mutate: uploadCreature, isPending } =
    UploadHooks.useUploadParticipant({
      creatureIcon: form.getValues("iconImage"),
      creatureStatBlock: form.getValues("statBlockImage"),
      onSuccess: () => {
        form.reset();
      },
    });

  useEffect(() => {
    console.log(form.formState.errors);
  }, [form.formState.errors]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6 p-5 w-full"
      >
        <FormField
          control={form.control}
          name={"is_player"}
          render={({ field }) => (
            <RadioGroup
              value={field.value ? "player" : "ally"}
              onValueChange={(v) => field.onChange(v === "player")}
            >
              <div className="flex gap-3 justify-start">
                <label>
                  Ally
                  <RadioGroupItem value="ally" />
                </label>
                <label>
                  Player
                  <RadioGroupItem value="player" />
                </label>
              </div>
            </RadioGroup>
          )}
        />
        <FormField
          control={form.control}
          name={"name"}
          render={({ field }) => {
            return <LidndTextInput required placeholder="Name" {...field} />;
          }}
        />
        <FormField
          control={form.control}
          name="statBlockImage"
          render={({ field }) => (
            <ImageUpload
              dropContainerClassName="h-52"
              onUpload={(image) => {
                field.onChange(image);
              }}
              dropText="Drop a Statblock"
              dropIcon={<FileText />}
              previewSize={800}
              image={field.value}
              clearImage={() => field.onChange(undefined)}
              fileInputProps={{ name: "stat_block_image" }}
            />
          )}
        />
        <div className="flex gap-3">
          <FormField
            control={form.control}
            name={"max_hp"}
            render={({ field }) => (
              <Input
                type="number"
                required
                placeholder="HP"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
          <FormField
            control={form.control}
            name={"challenge_rating"}
            render={({ field }) => (
              <Input
                type="number"
                placeholder="Challenge Rating"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="iconImage"
          render={({ field }) => {
            return (
              <ImageUpload
                image={field.value}
                clearImage={() => field.onChange(undefined)}
                onUpload={(image) => {
                  field.onChange(image);
                }}
                dropText="Drop an Icon"
                dropIcon={<User />}
                fileInputProps={{ name: "icon_image" }}
              />
            );
          }}
        />
        <Button type="submit">
          {isPending ? "Uploading..." : "Add participant"}
        </Button>
      </form>
    </FormProvider>
  );
}

export function MonsterUploadWithDifficulty({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  return (
    <div className="h-full flex flex-col gap-2">
      <EncounterDifficulty />
      <MonsterUpload encounter={encounter} />
    </div>
  );
}

type MonsterUploadProps = {
  encounter: EncounterWithParticipants;
};

export const MonsterUpload = function ParticipantUpload({
  encounter,
}: MonsterUploadProps) {
  return <DmCreatureForm />;
};

export function ExistingMonster({
  encounter,
  onUpload,
}: {
  encounter: EncounterWithParticipants;
  onUpload?: (creature: Creature) => void;
}) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    is_player: false,
  });

  return (
    <div className="flex flex-col max-h-full gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col overflow-auto gap-3 py-3 h-[600px]"}>
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

export function ExistingCreature({
  children,
  encounter,
}: {
  children?: React.ReactNode;
  encounter: Encounter;
}) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col gap-2 h-96 overflow-auto w-full"}>
          {creatures?.map((creature) => (
            <ListedCreature
              key={creature.id}
              creature={creature}
              encounter={encounter}
            />
          ))}
        </div>
      </Suspense>

      <div className={"flex gap-5"}>{children}</div>
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
