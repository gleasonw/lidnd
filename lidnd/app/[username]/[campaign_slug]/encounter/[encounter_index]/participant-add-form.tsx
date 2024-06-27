import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FullCreatureAddForm,
  MonsterUploadForm,
} from "@/app/[username]/[campaign_slug]/encounter/full-creature-add-form";
import { Creature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Plus, Skull, UserPlus } from "lucide-react";
import { observer } from "mobx-react-lite";
import React, { createContext, Suspense, useState } from "react";
import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useEncounterId } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/encounter-id";
import {
  useCreateCreatureInEncounter,
  useAddExistingCreatureToEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";

const AllyContext = createContext<boolean | null>(null);

const useAllyContext = () => React.useContext(AllyContext);

export function MonsterUpload() {
  const { mutate: createCreatureInEncounter } = useCreateCreatureInEncounter();

  return (
    <ParticipantUpload
      form={
        <MonsterUploadForm
          uploadCreature={(c) =>
            createCreatureInEncounter({
              creature: c,
              participant: {
                is_ally: false,
              },
            })
          }
        />
      }
      existingCreatures={<ExistingMonster />}
    />
  );
}

export function AllyUpload() {
  return (
    <AllyContext.Provider value={true}>
      <ParticipantUpload existingCreatures={<ExistingCreature />} />
    </AllyContext.Provider>
  );
}

type ParticipantUploadProps = {
  form?: React.ReactNode;
  existingCreatures?: React.ReactNode;
};

export const ParticipantUpload = function ParticipantUpload({
  form,
  existingCreatures,
}: ParticipantUploadProps) {
  const { mutate: addCreatureToEncounter } = useCreateCreatureInEncounter();

  return (
    <div>
      <Tabs defaultValue="new">
        <span className="flex gap-1 flex-wrap pr-2">
          <TabsList>
            <TabsTrigger value="new">
              <Plus /> Add new creature
            </TabsTrigger>
            <TabsTrigger value="existing">
              <UserPlus /> Existing creatures
            </TabsTrigger>
          </TabsList>
        </span>
        <TabsContent value="new">
          {form ?? (
            <FullCreatureAddForm
              uploadCreature={(data) =>
                addCreatureToEncounter({
                  creature: data,
                  participant: {
                    is_ally: false,
                  },
                })
              }
            />
          )}
        </TabsContent>
        <TabsContent value="existing">
          {existingCreatures ?? <ExistingCreature />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function ExistingMonster() {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    is_player: false,
  });

  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col gap-2 h-96 overflow-auto"}>
          {creatures?.map((creature) => (
            <ListedCreature key={creature.id} creature={creature} />
          ))}
        </div>
      </Suspense>
    </div>
  );
}

export function ExistingCreature({ children }: { children?: React.ReactNode }) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });

  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col gap-2 h-96 overflow-auto"}>
          {creatures?.map((creature) => (
            <ListedCreature key={creature.id} creature={creature} />
          ))}
        </div>
      </Suspense>

      <div className={"flex gap-5"}>{children}</div>
    </div>
  );
}

export interface ListedCreatureProps {
  creature: Creature;
}

export const ListedCreature = observer<ListedCreatureProps>(
  function ListedCreature({ creature }) {
    const { mutate: addCreatureToEncounter } =
      useAddExistingCreatureToEncounter();
    const isAlly = useAllyContext();
    const id = useEncounterId();

    return (
      <div className="flex items-center space-x-2 justify-between">
        <div className="flex gap-4">
          <CharacterIcon
            id={creature.id}
            name={creature.name}
            className={"rounded-full object-cover w-14 h-14"}
          />
          <div className="flex flex-col">
            <span className="font-semibold">{creature.name}</span>
            {creature.challenge_rating ? (
              <span className="flex gap-10 flex-wrap">
                <span className="flex gap-2 flex-wrap">
                  <Skull />
                  {creature.challenge_rating}
                </span>
                <span className="flex gap-2">
                  <Heart />
                  {creature.max_hp}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            key={creature.id}
            onClick={(e) => {
              e.stopPropagation();
              addCreatureToEncounter({
                creature_id: creature.id,
                encounter_id: id,
                is_ally: isAlly ?? false,
              });
            }}
          >
            <Plus /> Add
          </Button>
        </div>
      </div>
    );
  },
);
