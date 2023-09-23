"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import {
  useAddCreatureToEncounter,
  useImageUpload,
} from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CreatureAddForm() {
  const [creatureData, setCreatureData] = useState({
    name: "",
    max_hp: "",
    icon: "",
    stat_block: "",
  });
  const [iconImage, setIconImage] = useState<File | null>(null);
  const [statImage, setStatImage] = useState<File | null>(null);
  const { mutate: uploadImage } = useImageUpload();

  const id = useEncounterId();
  const { mutate: addCreature } = useAddCreatureToEncounter();

  return (
    <div className="flex flex-col gap-5">
      <Card className="max-w-sm flex flex-col gap-3 p-5 m-auto w-full">
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
          className="bg-gray-100 p-2 rounded-md h-40"
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];

            if (!item?.type.startsWith("image")) {
              e.preventDefault();
              return;
            }

            const file = item.getAsFile();
            setIconImage(file);
          }}
        />
        Paste stat block
        <div
          contentEditable
          className="bg-gray-100 p-2 rounded-md h-40"
          onPaste={(e) => {
            const clipboardData = e.clipboardData;
            const item = clipboardData.items[0];

            if (!item?.type.startsWith("image")) {
              e.preventDefault();
              return;
            }

            const file = item.getAsFile();
            setStatImage(file);
          }}
        />
        <Button
          className="p-5 border m-auto"
          variant={"secondary"}
          onClick={(e) => {
            e.stopPropagation();
            addCreature({
              ...creatureData,
              max_hp: parseInt(creatureData.max_hp),
            });
          }}
        >
          + Add creature
        </Button>
      </Card>
    </div>
  );
}
