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
    <Button {...props} variant="outline" className="flex w-full h-12">
      <CreatureIcon creature={creature} size="small" />
      <span className="mr-auto">{creature.name}</span>
      {children}
    </Button>
  );
}
