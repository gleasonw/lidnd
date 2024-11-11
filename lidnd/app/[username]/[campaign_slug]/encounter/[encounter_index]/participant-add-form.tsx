import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FullCreatureAddForm,
  MonsterUploadForm,
} from "@/app/[username]/[campaign_slug]/encounter/full-creature-add-form";
import type { Creature, Encounter } from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Plus, Skull, UserPlus } from "lucide-react";
import { observer } from "mobx-react-lite";
import React, { createContext, Suspense, useState } from "react";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import {
  useCreateCreatureInEncounter,
  useAddExistingCreatureToEncounter,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";

const AllyContext = createContext<boolean | null>(null);

const useAllyContext = () => React.useContext(AllyContext);

export function MonsterUpload({ encounter }: { encounter: Encounter }) {
  const { mutate: createCreatureInEncounter } = useCreateCreatureInEncounter({
    encounter,
  });

  return (
    <ParticipantUpload
      encounter={encounter}
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
      existingCreatures={<ExistingMonster encounter={encounter} />}
    />
  );
}

export function AllyUpload({ encounter }: { encounter: Encounter }) {
  return (
    <AllyContext.Provider value={true}>
      <ParticipantUpload
        encounter={encounter}
        existingCreatures={<ExistingCreature encounter={encounter} />}
      />
    </AllyContext.Provider>
  );
}

type ParticipantUploadProps = {
  form?: React.ReactNode;
  existingCreatures?: React.ReactNode;
  encounter: Encounter;
};

export const ParticipantUpload = function ParticipantUpload({
  form,
  existingCreatures,
  encounter,
}: ParticipantUploadProps) {
  const { mutate: addCreatureToEncounter } = useCreateCreatureInEncounter({
    encounter,
  });

  return (
    <Tabs defaultValue="new" className="flex flex-col gap-5 min-h-0 flex-1">
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
        {existingCreatures ?? <ExistingCreature encounter={encounter} />}
      </TabsContent>
    </Tabs>
  );
};

export function ExistingMonster({ encounter }: { encounter: Encounter }) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    is_player: false,
  });

  return (
    <div className="flex flex-col max-h-full">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div
          className={
            "flex flex-wrap overflow-auto max-h-full gap-5 min-h-0 h-48"
          }
        >
          {creatures?.map((creature) => (
            <ListedCreature
              key={creature.id}
              creature={creature}
              encounter={encounter}
            />
          ))}
        </div>
      </Suspense>
    </div>
  );
}

export function ExistingCreature({
  children,
  encounter,
}: {
  children?: React.ReactNode;
  encounter: Encounter;
}) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col gap-2 h-96 overflow-auto w-full"}>
          {creatures?.map((creature) => (
            <ListedCreature
              key={creature.id}
              creature={creature}
              encounter={encounter}
            />
          ))}
        </div>
      </Suspense>

      <div className={"flex gap-5"}>{children}</div>
    </div>
  );
}

export interface ListedCreatureProps {
  creature: Creature;
  encounter: Encounter;
}

export const ListedCreature = observer<ListedCreatureProps>(
  function ListedCreature({ creature, encounter }) {
    const { mutate: addCreatureToEncounter } =
      useAddExistingCreatureToEncounter(encounter);
    const isAlly = useAllyContext();
    const id = encounter.id;

    return (
      <div className="flex items-center space-x-2 justify-between shadow-lg p-5">
        <div className="flex gap-5">
          <CreatureIcon creature={creature} size="v-small" />
          <div className="flex flex-col">
            <span>{creature.name}</span>
            {creature.challenge_rating ? (
              <span className="flex gap-10 flex-wrap text-gray-500">
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
        <ButtonWithTooltip
          variant="outline"
          text="Add"
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
          <Plus />
        </ButtonWithTooltip>
      </div>
    );
  },
);
