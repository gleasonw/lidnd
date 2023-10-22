"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import {
  useAddCreatureToEncounter,
  useAddExistingCreatureToEncounter,
  useUserCreatures,
} from "@/app/dashboard/encounters/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { Spinner } from "@/components/ui/spinner";
import { UseMutateFunction } from "@tanstack/react-query";
import * as z from "zod";
import { AnimatePresence } from "framer-motion";
import { AnimationListItem } from "@/app/dashboard/encounters/[id]/run/battle-ui";

export const creatureFormSchema = z.object({
  name: z.string(),
  max_hp: z.number(),
  icon: z.instanceof(File),
  stat_block: z.instanceof(File),
});

export type CreaturePost = z.infer<typeof creatureFormSchema>;

export default function EncounterCreatureAddForm({
  className,
  onSuccess,
  children,
  customCreatureForm,
}: {
  className?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  customCreatureForm?: React.ReactNode;
}) {
  const tabs = ["custom", "existing"] as const;
  const { mutate: addCreature, isPending } =
    useAddCreatureToEncounter(onSuccess);
  return (
    <Tabs defaultValue="custom" className={className}>
      <TabsList>
        <TabsTrigger value="custom">New creature</TabsTrigger>
        <TabsTrigger value="existing">My archive</TabsTrigger>
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent value={tab} key={tab} className="flex flex-col gap-5">
          {tab === "custom" ? (
            customCreatureForm ?? (
              <CustomCreature
                onSuccess={onSuccess}
                mutation={{ onAddCreature: addCreature, isPending }}
              >
                {children}
              </CustomCreature>
            )
          ) : (
            <ExistingCreature onSuccess={onSuccess}>
              {children}
            </ExistingCreature>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

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
        onUpload={(file) => setCreatureData({ ...creatureData, icon: file })}
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

export function ImageUpload({
  onUpload,
  children,
}: {
  onUpload: (file?: File) => void;
  children?: React.ReactNode;
}) {
  const [hasContent, setHasContent] = React.useState(false);
  return (
    <span className="h-auto relative p-5 flex flex-col gap-5 items-center group">
      {!hasContent && (
        <span>
          Paste
        </span>
      )}
      <div
        placeholder="Paste image"
        contentEditable
        className="flex w-full relative rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onPaste={(e) => {
          const clipboardData = e.clipboardData;
          const item = clipboardData.items[0];
          console.log(item);

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

      <span>or</span>
      <Input type={"file"} disabled={hasContent} />
    </span>
  );
}

function ExistingCreature({
  children,
  onSuccess,
  className,
}: {
  children: React.ReactNode;
  onSuccess?: () => void;
  className?: string;
}) {
  const [name, setName] = useState("");
  const id = useEncounterId();

  const { data: creatures, isLoading: isLoadingCreatures } = useUserCreatures(
    name,
    id
  );
  const { mutate: addCreature, isPending } =
    useAddExistingCreatureToEncounter(onSuccess);

  return (
    <>
      <Input
        placeholder="Creature name"
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <AnimatePresence>
        {isLoadingCreatures ? <Spinner /> : null}
        {creatures?.map((creature) => (
          <AnimationListItem key={creature.id}>
            <button
              className={
                "flex gap-5 justify-between w-full transition-all hover:bg-gray-100"
              }
              onClick={(e) => {
                e.stopPropagation();
                addCreature({
                  creature_id: creature.id,
                  encounter_id: id,
                });
              }}
            >
              <CharacterIcon
                id={creature.id}
                name={creature.name}
                className={"w-20 h-20"}
              />
              {creature.name}
            </button>
          </AnimationListItem>
        ))}
      </AnimatePresence>
      <div className={"flex gap-5"}>{children}</div>
    </>
  );
}
