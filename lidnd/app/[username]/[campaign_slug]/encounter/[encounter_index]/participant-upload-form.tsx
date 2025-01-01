import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { ImageUpload } from "../image-upload";
import { Angry, FileText, Plus, User } from "lucide-react";
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
import { z } from "zod";
import { omit } from "remeda";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * We don't actually upload these, but we want to make sure the user has
 * a stat block image ready before triggering the full upload.
 */
const localCreatureUploadSchema = creatureUploadSchema.extend({
  statBlockImage: z.instanceof(File),
  iconImage: z.instanceof(File).optional(),
});

function useParticipantForm(role: "ally" | "opponent") {
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
      creatureIcon: form.getValues("iconImage"),
      creatureStatBlock: form.getValues("statBlockImage"),
      onSuccess: () => {
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

export function OpponentParticipantForm() {
  const { form, onSubmit, isPending } = useParticipantForm("opponent");

  return (
    <Tabs defaultValue="new" className="w-full">
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
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6 p-5 w-full"
          >
            <FormField
              control={form.control}
              name={"name"}
              render={({ field }) => {
                return (
                  <LidndTextInput required placeholder="Name" {...field} />
                );
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
