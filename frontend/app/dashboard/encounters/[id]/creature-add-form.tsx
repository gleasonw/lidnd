"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import {
  useAddExistingCreatureToEncounter,
  useUserCreatures,
} from "@/app/dashboard/encounters/api";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { Spinner } from "@/components/ui/spinner";
import { UseMutateFunction } from "@tanstack/react-query";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";

export const creatureFormSchema = z.object({
  name: z.string(),
  max_hp: z.number(),
  icon: z.any().optional(),
  stat_block: z.any().optional(),
  challenge_rating: z.number(),
  is_player: z.boolean()
});

export type CreaturePost = z.infer<typeof creatureFormSchema>;

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
  const [creatureData, setCreatureData] = useState({
    name: "",
    max_hp: "",
    icon: new File([], ""),
    stat_block: new File([], ""),
  });

  return (
    <>
      {mutation.isPending ? "Loading..." : null}
      <Input
        placeholder="Name"
        type="text"
        onChange={(e) =>
          setCreatureData({ ...creatureData, name: e.target.value })
        }
        value={creatureData.name}
      />
      <Input
        placeholder="Max hp"
        type="text"
        onChange={(e) =>
          setCreatureData({
            ...creatureData,
            max_hp: !isNaN(parseInt(e.target.value)) ? e.target.value : "",
          })
        }
        value={creatureData.max_hp}
      />
      <ImageUpload
        onUpload={(file) =>
          file ? setCreatureData({ ...creatureData, icon: file }) : null
        }
      />

      <ImageUpload
        onUpload={(file) =>
          file ? setCreatureData({ ...creatureData, stat_block: file }) : null
        }
      />

      <div className={"flex gap-5"}>
        {children}
        <Button
          className="p-5 border m-auto"
          variant={"outline"}
          onClick={(e) => {
            e.stopPropagation();
            if (
              !isNaN(parseInt(creatureData.max_hp)) &&
              creatureData.name &&
              creatureData.stat_block &&
              creatureData.icon
            ) {
              mutation.onAddCreature({
                name: creatureData.name,
                icon: creatureData.icon,
                max_hp: parseInt(creatureData.max_hp),
                stat_block: creatureData.stat_block,
                challenge_rating: 0,
                is_player: false,
              });
            } else {
              alert("Please fill out all fields");
            }
          }}
        >
          + Add creature
        </Button>
      </div>
    </>
  );
}

export function ImageUpload({ onUpload }: { onUpload: (file?: any) => void }) {
  const [hasContent, setHasContent] = React.useState(false);
  return (
    <span className="h-auto relative flex flex-col gap-5 items-center justify-center group">
      <span className="flex flex-wrap gap-2 items-center w-full relative rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <Input
          type={"file"}
          disabled={hasContent}
          className="max-w-sm"
          accept="image/png, image/jpeg, image/jpg"
          onChange={(e) => {
            if (e.target.files) {
              onUpload(e.target.files[0]);
            }
          }}
        />
        <div
          className={"w-full outline-none text-2xl"}
          contentEditable
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];

            if (!item?.type.startsWith("image")) {
              e.preventDefault();
              return;
            }

            const file = item.getAsFile();
            file !== null ? onUpload(file) : onUpload(undefined);
            setHasContent(true);
          }}
          onKeyDown={(e) => {
            setHasContent(e.currentTarget.textContent?.trim() !== "");
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

  const { data: creatures, isLoading: isLoadingCreatures } = useUserCreatures(
    name,
    id
  );
  const {
    mutate: addCreature,
    isPending: isAddingExistingCreature,
    variables,
  } = useAddExistingCreatureToEncounter();

  return (
    <>
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      {isLoadingCreatures ? <Spinner /> : null}
      <div className={"grid grid-cols-3 gap-5"}>
        {creatures?.map((creature) => (
          <button
            key={creature.id}
            disabled={isAddingExistingCreature}
            onClick={(e) => {
              e.stopPropagation();
              addCreature({
                creature_id: creature.id,
                encounter_id: id,
                name: creature.name,
              });
            }}
          >
            <Card
              className={clsx(
                "flex flex-col hover:bg-gray-100 transition-all",
                {
                  "opacity-80": isAddingExistingCreature,
                }
              )}
            >
              <CardContent
                className={
                  "flex flex-col justify-center gap-2 items-center p-2"
                }
              >
                <CharacterIcon
                  id={creature.id}
                  name={creature.name}
                  className={"w-20 h-20"}
                />
                {creature.name}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className={"flex gap-5"}>{children}</div>
    </>
  );
}
