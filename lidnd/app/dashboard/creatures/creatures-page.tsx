"use client";

import { CharacterIcon } from "@/encounters/[id]/character-icon";
import { FullCreatureAddForm } from "@/encounters/full-creature-add-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import { Creature } from "@/server/api/router";
import { useMutation } from "@tanstack/react-query";
import { getCreaturePostForm } from "@/encounters/utils";
import { CreaturePost } from "@/encounters/types";
import { rerouteUrl } from "@/app/login/page";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { DataTable } from "@/creatures/creatures-table";
import { columns } from "@/creatures/columns";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { getUserCreatures } = api.useUtils();
  const { data: creatures, isLoading: isLoadingCreatures } =
    api.getUserCreatures.useQuery({
      name,
    });
  const {
    mutate: deleteCreature,
    variables: deletedId,
    isLoading: isDeletePending,
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

  const { mutate: createCreature } = useMutation({
    mutationFn: async (rawData: CreaturePost) => {
      const formData = getCreaturePostForm(rawData);
      const response = await fetch(`${rerouteUrl}/api/creature/create`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.status !== 200) {
        console.log(data.detail);
        throw data;
      }
      return data;
    },
    onSettled: async () => {
      await getUserCreatures.invalidate({ name });
    },
    onMutate: async (data) => {
      await getUserCreatures.cancel({ name });
      const previous = getUserCreatures.getData({ name });
      getUserCreatures.setData({ name }, (old) => {
        if (!old) {
          return old;
        }
        return [
          ...old,
          { ...data, user_id: "", id: data.id ?? "", created_at: new Date() },
        ];
      });
      return { previous };
    },
  });

  const displayCreatures = isDeletePending
    ? creatures?.filter((creature) => creature.id !== deletedId)
    : creatures;

  return (
    <div className="grid md:grid-cols-2">
      <div className="flex flex-col gap-3">
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
              <DialogContent className="max-w-[900px] w-full h-5/6">
                <FullCreatureAddForm uploadCreature={createCreature} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={!name ? "opacity-100" : "opacity-0"}>
            {displayCreatures?.length} / 30
          </span>
          <div className="flex gap-10 flex-wrap ">
            {displayCreatures && (
              <DataTable columns={columns} data={displayCreatures} />
            )}
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <FullCreatureAddForm uploadCreature={createCreature} />
      </div>
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
      <CharacterIcon
        width={200}
        height={200}
        id={creature.id}
        name={creature.name}
      />
      <CreatureUpdateForm creature={creature} key={creature.id} />
      <Button variant="destructive" onClick={() => deleteCreature(creature.id)}>
        Delete
      </Button>
    </DialogContent>
  );
}

function CreatureUpdateForm({ creature }: { creature: Creature }) {
  const [challengeRating, setChallengeRating] = useState(
    creature.challenge_rating,
  );
  const [maxHp, setMaxHp] = useState(creature.max_hp);
  const [name, setName] = useState(creature.name);
  const [isPlayer, setIsPlayer] = useState(creature.is_player);

  const { mutate: updateCreature, isLoading } =
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
