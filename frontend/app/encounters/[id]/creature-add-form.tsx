"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import { useAddCreatureToEncounter } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CreatureAddForm() {
  const [creatureData, setCreatureData] = useState({
    name: "",
    max_hp: "",
    icon: "",
    stat_block: "",
  });

  const id = useEncounterId();
  const { mutate: addCreature } = useAddCreatureToEncounter();

  return (
    <div className="flex flex-col gap-5">
      <Card className="max-w-sm flex flex-col gap-3 p-5">
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
        <Input
          placeholder="Icon"
          type="text"
          onChange={(e) =>
            setCreatureData({ ...creatureData, icon: e.target.value })
          }
          value={creatureData.icon}
        />
        <Input
          placeholder="Stat Block"
          type="text"
          onChange={(e) =>
            setCreatureData({ ...creatureData, stat_block: e.target.value })
          }
          value={creatureData.stat_block}
        />
        <Button
          className="p-5 border"
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
