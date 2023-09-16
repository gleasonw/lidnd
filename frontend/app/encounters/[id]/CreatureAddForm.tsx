"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEncounterId } from "@/app/encounters/hooks";
import { addCreatureToEncounter } from "@/app/encounters/api";

export default function CreatureAddForm({
  add,
}: {
  add: typeof addCreatureToEncounter;
}) {
  const [creatureData, setCreatureData] = useState({
    name: "",
    max_hp: "",
    icon: "",
    stat_block: "",
  });

  const id = useEncounterId();

  const token = document.cookie.split("token=")[1];

  return (
    <div className="flex flex-col gap-5">
      <div className={"gap-11 flex flex-col jutsify-center"}>
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
      </div>
      <form
        action={async () =>
          await add(
            { encounter_id: id },
            { ...creatureData, max_hp: parseInt(creatureData.max_hp) }
          )
        }
      >
        <button type={"submit"} className="p-5 border">
          + Add creature
        </button>
      </form>
    </div>
  );
}
