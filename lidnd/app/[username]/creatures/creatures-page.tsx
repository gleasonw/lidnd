"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { Card } from "@/components/ui/card";
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
    onSettled: async () => {
      await getUserCreatures.invalidate();
    },
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
    <div className="flex w-full">
      <div className="flex flex-col gap-3 w-full">
        <div className={"flex gap-5 relative"}>
          <Input
            placeholder="Search"
            className={"max-w-lg"}
            type="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
          <div className="md:hidden">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[900px] w-full overflow-auto">
                <DialogTitle>Add creature</DialogTitle>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col w-full gap-10">
          <div>
            <h1>DM creatures</h1>
            <div className="flex w-full gap-2 flex-wrap">
              {groupedCreatures?.npc?.map((creature) => (
                <Card key={creature.id} className="flex gap-2 p-3 items-center">
                  <CreatureIcon creature={creature} size="medium" />
                  <span className="text-lg">{creature.name}</span>
                  <Button
                    variant="ghost"
                    className="text-red-300"
                    onClick={() => deleteCreature(creature.id)}
                  >
                    <Trash />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h1>Player creatures</h1>
            <div className="flex w-full gap-2 flex-wrap">
              {groupedCreatures?.player?.map((creature) => (
                <Card key={creature.id} className="flex gap-2 p-3 items-center">
                  <CreatureIcon creature={creature} size="medium" />
                  <span className="text-lg">{creature.name}</span>
                  <Button
                    variant="ghost"
                    className="text-red-300"
                    onClick={() => deleteCreature(creature.id)}
                  >
                    <Trash />
                  </Button>
                </Card>
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
      <Button variant="destructive" onClick={() => deleteCreature(creature.id)}>
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
        Player
        <Checkbox
          checked={isPlayer ?? false}
          onCheckedChange={(checked) =>
            checked !== "indeterminate" && setIsPlayer(checked)
          }
        />
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
          });
        }}
        isLoading={isLoading}
      >
        Update
      </LoadingButton>
    </form>
  );
}
