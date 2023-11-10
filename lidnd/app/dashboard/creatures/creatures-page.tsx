"use client";

import { CharacterIcon } from "@/app/dashboard/encounters/[id]/character-icon";
import { FullCreatureAddForm } from "@/app/dashboard/full-creature-add-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { api } from "@/trpc/react";
import { Creature } from "@/server/api/router";
import { useMutation } from "@tanstack/react-query";
import { getCreaturePostForm } from "@/app/dashboard/encounters/utils";
import { CreaturePost } from "@/app/dashboard/encounters/[id]/creature-add-form";
import { rerouteUrl } from "@/app/login/page";

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
  const [isAddingCreatures, setIsAddingCreatures] = useState(false);

  const { mutate: createCreature } = useMutation({
    mutationFn: async (rawData: CreaturePost) => {
      const formData = getCreaturePostForm(rawData);
      const response = await fetch(`${process.env.DOMAIN}/api/creature/create`, {
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
    <div className="flex flex-col gap-10 ">
      <h1 className="text-3xl">Creatures</h1>

      <div className={"flex gap-5 relative"}>
        <Input
          placeholder="Search"
          className={"max-w-lg"}
          type="text"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
        {!isAddingCreatures && (
          <Button
            onClick={() => setIsAddingCreatures(true)}
            className="flex gap-3"
          >
            <Plus />
          </Button>
        )}
      </div>
      {isAddingCreatures && (
        <>
          <Button variant="ghost" onClick={() => setIsAddingCreatures(false)}>
            <X />
          </Button>
          <Card className="max-w-[900px] w-full mx-auto pt-5">
            <CardContent>
              <FullCreatureAddForm uploadCreature={createCreature} />
            </CardContent>
          </Card>
        </>
      )}
      <span className={!name ? "opacity-100" : "opacity-0"}>
        {displayCreatures?.length} / 30
      </span>
      <div className="flex gap-10 flex-wrap justify-center">
        {isLoadingCreatures &&
          Array(5)
            .fill(null)
            .map((_, i) => (
              <Card
                key={i}
                className={"animate-pulse w-72 h-[600px] bg-gray-200"}
              />
            ))}
        {displayCreatures?.map((creature) => (
          <Card
            key={creature.id}
            className={clsx(
              "relative select-none p-3 justify-between overflow-hidden pt-3 gap-5 items-center flex flex-col transition-all"
            )}
          >
            <h2>{creature.name}</h2>
            <CharacterIcon
              width={200}
              height={200}
              id={creature.id}
              name={creature.name}
            />
            <CreatureUpdateForm creature={creature} />
            <Button
              variant="destructive"
              onClick={() => deleteCreature(creature.id)}
            >
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreatureUpdateForm({ creature }: { creature: Creature }) {
  const [challengeRating, setChallengeRating] = useState(
    creature.challenge_rating
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
