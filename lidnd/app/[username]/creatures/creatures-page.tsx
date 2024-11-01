"use client";

import { FullCreatureAddForm } from "@/app/[username]/[campaign_slug]/encounter/full-creature-add-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import type { Creature } from "@/server/api/router";
import { useMutation } from "@tanstack/react-query";
import { getCreaturePostForm } from "@/app/[username]/[campaign_slug]/encounter/utils";
import type { CreaturePost } from "@/app/[username]/[campaign_slug]/encounter/types";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import { DataTable } from "@/app/[username]/creatures/creatures-table";
import { columns } from "@/app/[username]/creatures/columns";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { postCreature } from "@/app/[username]/actions";
import { CreatureUtils } from "@/utils/creatures";

export default function CreaturesPage() {
  const [name, setName] = useState("");
  const { getUserCreatures } = api.useUtils();
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(
    null,
  );

  const selectedCreature = creatures?.find(
    (creature) => creature.id === selectedCreatureId,
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

  const { mutate: createCreature } = useMutation({
    mutationFn: async (rawData: CreaturePost) => {
      const formData = getCreaturePostForm({
        ...rawData,
        max_hp: rawData.max_hp ? rawData.max_hp : 1,
      });
      return await postCreature(formData);
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
        return [...old, CreatureUtils.placeholder(data)];
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
              <DialogContent className="max-w-[900px] w-full overflow-auto">
                <DialogTitle>Add creature</DialogTitle>
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
              <DataTable
                columns={columns}
                data={displayCreatures}
                onRowClick={(row) => setSelectedCreatureId(row.original.id)}
              />
            )}
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <FullCreatureAddForm uploadCreature={createCreature} />
      </div>
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
    creature.challenge_rating,
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
