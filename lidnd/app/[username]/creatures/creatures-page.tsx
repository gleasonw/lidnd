"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useState } from "react";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { groupBy } from "remeda";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { getUserCreatures } = api.useUtils();
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(
    null
  );

  const selectedCreature = creatures?.find(
    (creature) => creature.id === selectedCreatureId
  );

  const {
    mutate: deleteCreature,
    variables: deletedId,
    isPending: isDeletePending,
  } = api.deleteCreature.useMutation({
    onMutate: async (id) => {
      await getUserCreatures.cancel({ name });
      const previous = getUserCreatures.getData({ name });
      getUserCreatures.setData({ name }, (old) => {
        return old?.filter((creature) => creature.id !== id);
      });
      return { previous };
    },
  });

  const displayCreatures = isDeletePending
    ? creatures?.filter((creature) => creature.id !== deletedId)
    : creatures;

  const groupedCreatures = groupBy(displayCreatures ?? [], (c) =>
    c.is_player ? "player" : "npc"
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
          <CreatureUpdateDialog
            creature={selectedCreature}
            deleteCreature={deleteCreature}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function CreatureCard({
  creature,
  setSelectedCreatureId,
}: {
  creature: Creature;
  setSelectedCreatureId: (id: string | null) => void;
}) {
  return (
    <div key={creature.id} className="flex gap-2 p-3 items-center">
      <Button
        variant="ghost"
        onClick={() => setSelectedCreatureId(creature.id)}
      >
        <CreatureIcon creature={creature} size="medium" />
        <span>{creature.name}</span>
      </Button>
    </div>
  );
}

function CreatureUpdateDialog({
  creature,
  deleteCreature,
}: {
  creature: Creature;
  deleteCreature: (id: string) => void;
}) {
  return (
    <DialogContent>
      <DialogHeader className="text-ellipsis max-w-full p-3">
        <DialogTitle>{creature.name}</DialogTitle>
      </DialogHeader>
      <CreatureIcon creature={creature} size="medium" />
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

function CreatureUpdateForm({ creature }: { creature: Creature }) {
  const [challengeRating, setChallengeRating] = useState(
    creature.challenge_rating
  );
  const [maxHp, setMaxHp] = useState(creature.max_hp);
  const [name, setName] = useState(creature.name);
  const [isPlayer, setIsPlayer] = useState(creature.is_player);
  const [isInanimate, setIsInanimate] = useState(creature.is_inanimate);

  const { mutate: updateCreature, isPending: isLoading } =
    api.updateCreature.useMutation();

  return (
    <form className="flex flex-col gap-5 justify-between">
      {!creature.is_player && (
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
      <label>
        <Checkbox
          checked={isPlayer ?? false}
          onCheckedChange={(checked) =>
            checked !== "indeterminate" && setIsPlayer(checked)
          }
        />
        Player
      </label>
      <label>
        <Checkbox
          checked={isInanimate ?? false}
          onCheckedChange={(checked) =>
            checked !== "indeterminate" && setIsInanimate(checked)
          }
        />
        Inanimate (show only statblock and name)
      </label>
      <LoadingButton
        onClick={(e) => {
          e.preventDefault();
          updateCreature({
            id: creature.id,
            challenge_rating: challengeRating,
            max_hp: maxHp,
            name,
            is_player: isPlayer,
            is_inanimate: isInanimate,
          });
        }}
        isLoading={isLoading}
      >
        Update
      </LoadingButton>
    </form>
  );
}
