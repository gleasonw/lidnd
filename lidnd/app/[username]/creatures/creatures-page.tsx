"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useState } from "react";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { groupBy } from "remeda";
import { useDeleteCreature } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { ParticipantUtils } from "@/utils/participants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { creatureTypes } from "@/server/constants";
import { LidndLabel } from "@/components/ui/LidndLabel";
import { CreatureUtils } from "@/utils/creatures";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(
    null
  );

  const selectedCreature = creatures?.find(
    (creature) => creature.id === selectedCreatureId
  );

  const displayCreatures = creatures;

  const groupedCreatures = groupBy(displayCreatures ?? [], (c) =>
    ParticipantUtils.isPlayer({ creature: c }) ? "player" : "npc"
  );

  return (
    <div className="flex w-full p-3">
      <div className="flex flex-col gap-3 w-full">
        <div className={"flex gap-5 relative"}>
          <Input
            placeholder="Search"
            className={"max-w-lg"}
            type="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        <div className="flex flex-col w-full gap-10">
          <div>
            <h1>DM creatures</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {groupedCreatures?.npc?.map((creature) => (
                <CreatureCard
                  key={creature.id}
                  creature={creature}
                  setSelectedCreatureId={setSelectedCreatureId}
                />
              ))}
            </div>
          </div>
          <div>
            <h1>Player creatures</h1>
            <div className="flex w-full gap-2 flex-wrap">
              {groupedCreatures?.player?.map((creature) => (
                <CreatureCard
                  key={creature.id}
                  creature={creature}
                  setSelectedCreatureId={setSelectedCreatureId}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden md:block"></div>
      <Dialog
        open={selectedCreatureId !== null}
        onOpenChange={(isOpen) =>
          setSelectedCreatureId(isOpen ? selectedCreatureId : null)
        }
      >
        {selectedCreature ? (
          <CreatureUpdateDialog creature={selectedCreature} />
        ) : null}
      </Dialog>
    </div>
  );
}

export function CreatureCard({
  creature,
  setSelectedCreatureId,
  extra,
}: {
  creature: Creature;
  setSelectedCreatureId?: (id: string | null) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div key={creature.id} className="flex gap-2 p-3 items-center">
      <Button
        variant="ghost"
        onClick={() => setSelectedCreatureId?.(creature.id)}
      >
        <CreatureIcon creature={creature} size="medium" />
        <span>{creature.name}</span>
      </Button>
      {extra}
    </div>
  );
}

export function CreatureUpdateDialog({ creature }: { creature: Creature }) {
  const { mutate: deleteCreature } = useDeleteCreature();
  return (
    <DialogContent>
      <DialogHeader className="text-ellipsis max-w-full p-3">
        <DialogTitle>{creature.name}</DialogTitle>
      </DialogHeader>
      <CreatureIcon creature={creature} size="small" />
      <CreatureUpdateForm creature={creature} key={creature.id} />
      <Button
        variant="ghost"
        className="text-destructive"
        onClick={() => deleteCreature(creature.id)}
      >
        Delete
      </Button>
    </DialogContent>
  );
}

export function CreatureUpdateForm({ creature }: { creature: Creature }) {
  const [challengeRating, setChallengeRating] = useState(
    creature.challenge_rating
  );
  const [maxHp, setMaxHp] = useState(creature.max_hp);
  const [name, setName] = useState(creature.name);
  const [type, setType] = useState(creature.type);

  const { mutate: updateCreature, isPending: isLoading } =
    api.updateCreature.useMutation();
  const { mutate: deleteCreature } = useDeleteCreature();

  return (
    <form className="flex flex-col gap-5 justify-between">
      {!CreatureUtils.isPlayer(creature) && (
        <label>
          Challenge Rating
          <Input
            type="number"
            value={challengeRating}
            onChange={(e) => setChallengeRating(parseInt(e.target.value))}
          />
        </label>
      )}

      <label>
        Max HP
        <Input
          type="number"
          value={maxHp}
          onChange={(e) => setMaxHp(parseInt(e.target.value))}
        />
      </label>
      <label>
        Name
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <LidndLabel label="Creature type">
        <Select
          value={type}
          onValueChange={(value) =>
            setType(value as (typeof creatureTypes)[number])
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {creatureTypes.map((ct) => (
              <SelectItem key={ct} value={ct}>
                {ct.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LidndLabel>

      <div className="flex">
        <LoadingButton
          onClick={(e) => {
            e.preventDefault();
            updateCreature({
              id: creature.id,
              challenge_rating: challengeRating,
              max_hp: maxHp,
              name,
              type,
            });
          }}
          isLoading={isLoading}
        >
          Update
        </LoadingButton>
        <Button
          onClick={() => deleteCreature(creature.id)}
          className="ml-auto text-destructive"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </form>
  );
}
