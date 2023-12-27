"use client";

import React, { Suspense, useId, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import { UseMutateFunction } from "@tanstack/react-query";
import * as z from "zod";
import { range } from "lodash";
import {
  Creature,
  EncounterCreature,
  creatureUploadSchema,
} from "@/server/api/router";
import { api } from "@/trpc/react";
import Image from "next/image";
import { Heart, Plus, Skull, X } from "lucide-react";

export type CreaturePost = z.infer<typeof creatureUploadSchema> & {
  stat_block_image?: File;
  minion_count?: number;
};

export function CustomCreature({
  children,
  onSuccess,
  mutation,
}: {
  children?: React.ReactNode;
  onSuccess?: () => void;
  mutation: {
    onAddCreature: UseMutateFunction<any, unknown, CreaturePost, unknown>;
    isPending: boolean;
  };
  formFields?: React.ReactNode;
}) {
  const [creatureData, setCreatureData] = useState<
    Pick<
      CreaturePost,
      "name" | "max_hp" | "icon_image" | "stat_block_image" | "minion_count"
    >
  >({
    name: "",
    max_hp: 0,
    icon_image: undefined,
    stat_block_image: undefined,
    minion_count: 0,
  });

  return (
    <>
      {mutation.isPending ? "Loading..." : null}
      <label>
        <span>Name</span>
        <Input
          placeholder="Name"
          type="text"
          onChange={(e) =>
            setCreatureData({ ...creatureData, name: e.target.value })
          }
          value={creatureData.name}
        />
      </label>
      <label>
        <span>Icon</span>
        <ImageUpload
          onUpload={(file) =>
            file ? setCreatureData({ ...creatureData, icon_image: file }) : null
          }
          image={creatureData.icon_image}
          clearImage={() =>
            setCreatureData({ ...creatureData, icon_image: undefined })
          }
        />
      </label>

      <label>
        <span>Stat block</span>
        <ImageUpload
          onUpload={(file) =>
            file
              ? setCreatureData({ ...creatureData, stat_block_image: file })
              : null
          }
          image={creatureData.stat_block_image}
          clearImage={() =>
            setCreatureData({
              ...creatureData,
              stat_block_image: undefined,
            })
          }
          previewSize={600}
        />
      </label>
      <label>
        <span>Max hp</span>
        <Input
          placeholder="Max hp"
          type="number"
          onChange={(e) =>
            setCreatureData({
              ...creatureData,
              max_hp: parseInt(e.target.value),
            })
          }
          value={creatureData.max_hp}
        />
      </label>

      <div className={"flex gap-5"}>
        {children}
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            if (
              creatureData.max_hp &&
              creatureData.name &&
              creatureData.stat_block_image &&
              creatureData.icon_image
            ) {
              mutation.onAddCreature({
                name: creatureData.name,
                icon_image: creatureData.icon_image,
                max_hp: creatureData.max_hp,
                stat_block_image: creatureData.stat_block_image,
                challenge_rating: 0,
                is_player: false,
                minion_count: creatureData.minion_count,
              });
            } else {
              alert("Please fill out all fields");
            }
          }}
        >
          <Plus /> Add creature
        </Button>
        <Input
          type="number"
          placeholder="# minions..."
          className="w-32"
          onChange={(e) =>
            setCreatureData({
              ...creatureData,
              minion_count: parseInt(e.target.value),
            })
          }
          value={creatureData.minion_count}
        />
      </div>
    </>
  );
}

export function ImageUpload({
  onUpload,
  image,
  clearImage,
  previewSize = 200,
}: {
  onUpload: (file?: File) => void;
  image?: File;
  clearImage: () => void;
  previewSize?: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (image && image instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(image);
    } else {
      setPreviewUrl(null);
    }
  }, [image]);

  return (
    <span className="h-auto relative flex flex-col gap-5 group">
      {previewUrl && (
        <div className="relative w-fit">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              clearImage();
            }}
            className="absolute top-0 right-0"
          >
            <X />
          </Button>
          <Image
            src={previewUrl}
            alt={"preview image for " + image?.name}
            width={previewSize}
            height={previewSize}
          />
        </div>
      )}
      <span className="flex gap-3 items-center">
        <Input
          type={"file"}
          className="max-w-xs"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => {
            if (e.target.files) {
              onUpload(e.target.files[0]);
            }
          }}
        />
        or
        <Input
          placeholder="Paste image"
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];

            if (!item?.type.startsWith("image")) {
              e.preventDefault();
              return;
            }
            onUpload(item.getAsFile() ?? undefined);
          }}
        />
      </span>
    </span>
  );
}

export function ExistingCreature({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [name, setName] = useState("");
  const id = useEncounterId();
  const { encounterById } = api.useUtils();

  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const { mutate: addCreature, isLoading: isAddingExistingCreature } =
    api.addExistingCreatureToEncounter.useMutation({
      onMutate: async ({ creature_id }) => {
        await encounterById.cancel(id);
        const previousEncounterData = encounterById.getData(id);
        const optimisticId = Math.random().toString();
        encounterById.setData(id, (old) => {
          if (!old) {
            return;
          }
          const selectedCreature = creatures?.find(
            (creature) => creature.id === creature_id
          );
          if (!selectedCreature) return;
          const newParticipant: EncounterCreature = {
            encounter_id: old.id,
            creature_id: creature_id,
            id: optimisticId,
            initiative: 0,
            hp: selectedCreature.max_hp,
            name: selectedCreature.name,
            challenge_rating: selectedCreature.challenge_rating,
            max_hp: selectedCreature.max_hp,
            is_player: selectedCreature.is_player,
            is_active: false,
            created_at: new Date(),
            user_id: old.user_id,
            has_surprise: false,
            status_effects: [],
            minion_count: 0,
          };
          return {
            ...old,
            participants: [...old.participants, newParticipant],
          };
        });
        return { previousEncounterData };
      },
      onError: (err, variables, context) => {
        if (context?.previousEncounterData) {
          encounterById.setData(id, context.previousEncounterData);
        }
      },
      onSettled: () => {
        encounterById.invalidate(id);
      },
    });

  return (
    <>
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <ExistingCreatureOptions name={name} addCreature={addCreature} />
      </Suspense>

      <div className={"flex gap-5"}>{children}</div>
    </>
  );
}

export type CreatureAddFunction = ({
  creature_id,
  encounter_id,
  minion_count,
}: {
  creature_id: string;
  encounter_id: string;
  minion_count: number;
}) => void;

function ExistingCreatureOptions({
  name,
  addCreature,
}: {
  name: string;
  addCreature: CreatureAddFunction;
}) {
  const id = useEncounterId();
  const [creatures, creaturesQuery] = api.getUserCreatures.useSuspenseQuery({
    name,
  });
  return (
    <div className={"flex flex-col gap-2 max-h-full overflow-auto"}>
      {creatures?.map((creature) => (
        <ListedCreature
          key={creature.id}
          creature={creature}
          addCreature={addCreature}
        />
      ))}
    </div>
  );
}

export interface ListedCreatureProps {
  creature: Creature;
  children?: React.ReactNode;
  addCreature: CreatureAddFunction;
}

export function ListedCreature({
  creature,
  children,
  addCreature,
}: ListedCreatureProps) {
  const id = useEncounterId();
  const [minionCount, setMinionCount] = useState<number | undefined>();
  return (
    <div className="flex items-center flex-wrap space-x-2 justify-between">
      <div className="flex gap-4">
        <CharacterIcon
          id={creature.id}
          name={creature.name}
          className={"rounded-full object-cover w-14 h-14"}
        />
        <div className="flex flex-col">
          <span className="font-semibold">{creature.name}</span>
          {creature.challenge_rating ? (
            <span className="flex gap-10 flex-wrap">
              <span className="flex gap-2 flex-wrap">
                <Skull />
                {creature.challenge_rating}
              </span>
              <span className="flex gap-2">
                <Heart />
                {creature.max_hp}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          key={creature.id}
          onClick={(e) => {
            e.stopPropagation();
            addCreature({
              creature_id: creature.id,
              encounter_id: id,
              minion_count: minionCount ?? 0,
            });
          }}
        >
          <Plus /> Add
        </Button>
        <Input
          type="number"
          className="w-32"
          placeholder="# minions..."
          value={minionCount}
          onChange={(e) => setMinionCount(parseInt(e.target.value))}
        />
      </div>
    </div>
  );
}
