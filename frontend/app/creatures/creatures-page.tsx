"use client";

import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import { useDeleteCreature, useUserCreatures } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { data: creatures } = useUserCreatures(name);
  const { mutate: deleteCreature } = useDeleteCreature();
  return (
    <div className="flex flex-col gap-10">
      <Input
        placeholder="Search"
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <div className="flex gap-5 flex-wrap">
        {creatures?.map((creature) => (
          <Card
            key={creature.id}
            className={"p-8 flex flex-col gap-3 relative"}
          >
            <div
              className={
                "opacity-0 absolute top-0 left-0 w-full h-full hover:opacity-100 transition-opacity"
              }
            >
              <Button
                variant={"destructive"}
                className="absolute top-2 right-2 w-14"
                onClick={() => deleteCreature(creature.id)}
              >
                Delete
              </Button>
            </div>

            <h2>{creature.name}</h2>
            <CharacterIcon id={creature.id} name={creature.name} />
          </Card>
        ))}
      </div>
    </div>
  );
}
