"use client";

import { LoadingButton } from "@/app/components/LoadingButton";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function CreatureAddForm({ addCreature }) {
  const [creatureData, setCreatureData] = useState({
    name: "",
    initiative: 0,
  });

  const pathname = usePathname();
  const id = pathname.split("/")[2];
  const token = document.cookie.split("token=")[1];

  return (
    <>
      <input
        type="text"
        onChange={(e) =>
          setCreatureData({ ...creatureData, name: e.target.value })
        }
        value={creatureData.name}
      />
      <input
        type="number"
        onChange={(e) =>
          setCreatureData({
            ...creatureData,
            initiative: parseInt(e.target.value),
          })
        }
        value={creatureData.initiative}
      />
      <form action={async () => await addCreature({ id, token, creatureData })}>
        <LoadingButton type={"submit"}>Add creature</LoadingButton>
      </form>
    </>
  );
}
