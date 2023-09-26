"use client";

import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import { useUserCreatures } from "@/app/encounters/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { data: creatures } = useUserCreatures(name);
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
          <Card key={creature.id} className={"p-3"}>
            <h2>{creature.name}</h2>
            <CharacterIcon id={creature.id} name={creature.name} />
          </Card>
        ))}
      </div>
    </div>
  );
}
