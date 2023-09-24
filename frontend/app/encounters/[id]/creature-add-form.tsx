"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import { useAddCreatureToEncounter } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CreaturePost = {
  name: string;
  max_hp: string;
  icon: File | null;
  stat_block: File | null;
};

export default function CreatureAddForm({
  className,
  onSuccess,
  children,
}: {
  className?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}) {
  const [creatureData, setCreatureData] = useState<CreaturePost>({
    name: "",
    max_hp: "",
    icon: null,
    stat_block: null,
  });

  const id = useEncounterId();
  const { mutate: addCreature, isLoading } =
    useAddCreatureToEncounter(onSuccess);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <Card className="max-w-sm flex flex-col gap-3 p-5 m-auto w-full">
        {isLoading ? "Loading..." : null}
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
            setCreatureData({ ...creatureData, icon: file });
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
            setCreatureData({ ...creatureData, stat_block: file });
          }}
        />
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
                addCreature({
                  ...creatureData,
                  max_hp: parseInt(creatureData.max_hp),
                });
              } else {
                alert("Please fill out all fields");
              }
            }}
          >
            + Add creature
          </Button>
        </div>
      </Card>
    </div>
  );
}
