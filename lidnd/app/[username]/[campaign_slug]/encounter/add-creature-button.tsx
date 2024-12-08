"use client";

import { Button } from "@/components/ui/button";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import type { Creature } from "@/server/api/router";

type AddCreatureButtonProps = {
  creature: Creature;
  children?: React.ReactNode;
} & React.ComponentProps<typeof Button>;

export function AddCreatureButton({
  creature,
  children,
  ...props
}: AddCreatureButtonProps) {
  return (
    <Button
      {...props}
      variant="outline"
      className="grid w-full grid-cols-3 h-12 items-start m-0 p-0 justify-start"
    >
      <div className="flex items-center gap-2 col-span-2 h-12">
        <CreatureIcon creature={creature} size="small" />
        <span className="truncate ">{creature.name}</span>
      </div>
      {children}
    </Button>
  );
}
