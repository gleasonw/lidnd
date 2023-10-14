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
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flipped, Flipper } from "react-flip-toolkit";
import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { Spinner } from "@/components/ui/spinner";
import { UseMutateFunction } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import {
  DamageType,
  ResistanceSelector,
} from "@/app/dashboard/encounters/[id]/resistance-selector";

export type CreaturePost = {
  name: string;
  max_hp: number;
  icon: File;
  stat_block: File;
};

export default function EncounterCreatureAddForm({
  className,
  onSuccess,
  children,
  formFields
}: {
  className?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  formFields?: React.ReactNode;
}) {
  const tabs = ["custom", "existing"] as const;
  const { mutate: addCreature, isLoading } =
    useAddCreatureToEncounter(onSuccess);
  return (
    <Tabs defaultValue="custom" className={className}>
      <Card className={`max-w-sm p-5 w-full h-fit ${className}`}>
        <TabsList>
          <TabsTrigger value="custom">New creature</TabsTrigger>
          <TabsTrigger value="existing">My archive</TabsTrigger>
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent value={tab} key={tab} className="flex flex-col gap-5">
            {tab === "custom" ? (
              <CustomCreature
                onSuccess={onSuccess}
                mutation={{ onAddCreature: addCreature, isLoading }}
                formFields={formFields}
              >
                {children}
              </CustomCreature>
            ) : (
              <ExistingCreature onSuccess={onSuccess}>
                {children}
              </ExistingCreature>
            )}
          </TabsContent>
        ))}
      </Card>
    </Tabs>
  );
}

export function CustomCreature({
  children,
  onSuccess,
  mutation,
  formFields,
}: {
  children?: React.ReactNode;
  onSuccess?: () => void;
  mutation: {
    onAddCreature: UseMutateFunction<any, unknown, CreaturePost, unknown>;
    isLoading: boolean;
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
      {mutation.isLoading ? "Loading..." : null}
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
      Paste icon
      <div
        contentEditable
        className="bg-gray-100 p-2 rounded-md h-auto"
        onPaste={(e) => {
          const clipboardData = e.clipboardData;
          const item = clipboardData.items[0];

          if (!item?.type.startsWith("image")) {
            e.preventDefault();
            return;
          }

          const file = item.getAsFile();
          file !== null
            ? setCreatureData({ ...creatureData, icon: file })
            : null;
        }}
      />
      Paste stat block
      <div
        contentEditable
        className="bg-gray-100 p-2 rounded-md h-auto"
        onPaste={(e) => {
          const clipboardData = e.clipboardData;
          const item = clipboardData.items[0];

          if (!item?.type.startsWith("image")) {
            e.preventDefault();
            return;
          }

          const file = item.getAsFile();
          file !== null
            ? setCreatureData({ ...creatureData, stat_block: file })
            : null;
        }}
      />
      {formFields}
      <div className={"flex gap-5"}>
        {children}
        <Button
          className="p-5 border m-auto"
          variant={"secondary"}
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
  const { mutate: addCreature, isLoading } =
    useAddExistingCreatureToEncounter(onSuccess);

  return (
    <>
      <Input
        placeholder="Creature name"
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Flipper flipKey={creatures?.map((creature) => creature.id).join("")}>
        {isLoadingCreatures ? <Spinner /> : null}
        {creatures?.map((creature) => (
          <Flipped flipId={creature.id} key={creature.id}>
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
          </Flipped>
        ))}
      </Flipper>
      <div className={"flex gap-5"}>{children}</div>
    </>
  );
}
