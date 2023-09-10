"use client";

import { LoadingButton } from "@/app/components/LoadingButton";
import { addCreature } from "@/app/encounters/[id]/page";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Flex } from "@radix-ui/themes";
import Input from "@/app/components/Input";

export default function CreatureAddForm({ add }: { add: typeof addCreature }) {
  const [creatureData, setCreatureData] = useState({
    name: "",
    initiative: 0,
    icon: "",
    stat_block: "",
  });

  const pathname = usePathname();
  const id = pathname.split("/")[2];
  const token = document.cookie.split("token=")[1];

  return (
    <div className="flex flex-col gap-5 shadow m-5">
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
          placeholder="Initiative"
          type="number"
          onChange={(e) =>
            setCreatureData({
              ...creatureData,
              initiative: parseInt(e.target.value),
            })
          }
          value={creatureData.initiative}
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
      <form action={async () => await add({ id, token, creatureData })}>
        <LoadingButton type={"submit"}>Add creature</LoadingButton>
      </form>
    </div>
  );
}
