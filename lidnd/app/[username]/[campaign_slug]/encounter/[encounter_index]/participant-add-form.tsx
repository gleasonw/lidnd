import { Input } from "@/components/ui/input";
import { MonsterUploadForm } from "@/app/[username]/[campaign_slug]/encounter/full-creature-add-form";
import type {
  Creature,
  Encounter,
  EncounterWithParticipants,
} from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Skull } from "lucide-react";
import { observer } from "mobx-react-lite";
import React, { createContext, Suspense, useState } from "react";
import {
  useCreateCreatureInEncounter,
  useAddExistingCreatureAsParticipant,
} from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { AddCreatureButton } from "@/encounters/add-creature-button";
import { EncounterDifficulty } from "@/encounters/[encounter_index]/encounter-top-bar";

const AllyContext = createContext<boolean | null>(null);

const useAllyContext = () => React.useContext(AllyContext);

export function MonsterUploadWithDifficulty({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  return (
    <div className="h-full flex flex-col gap-2">
      <EncounterDifficulty />
      <MonsterUpload encounter={encounter} />
    </div>
  );
}

type MonsterUploadProps = {
  encounter: EncounterWithParticipants;
};

export const MonsterUpload = function ParticipantUpload({
  encounter,
}: MonsterUploadProps) {
  const { mutate: addCreatureToEncounter } = useCreateCreatureInEncounter({
    encounter,
  });

  return (
    <div defaultValue="new" className="grid grid-cols-2 gap-3">
      <MonsterUploadForm
        uploadCreature={(data) => {
          addCreatureToEncounter({
            creature: data,
            participant: {
              is_ally: false,
            },
          });
        }}
      />
      <ExistingMonster encounter={encounter} />
    </div>
  );
};

export function ExistingMonster({
  encounter,
  onUpload,
}: {
  encounter: EncounterWithParticipants;
  onUpload?: (creature: Creature) => void;
}) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
    is_player: false,
  });

  return (
    <div className="flex flex-col max-h-full gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <Suspense key={name} fallback={<div>Loading creatures</div>}>
        <div className={"flex flex-col overflow-auto gap-3 py-3 h-[600px]"}>
          {creatures?.map((creature) => (
            <ListedCreature
              key={creature.id}
              creature={creature}
              encounter={encounter}
              onSelect={onUpload}
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
  onSelect?: (creature: Creature) => void;
}

export const ListedCreature = observer<ListedCreatureProps>(
  function ListedCreature({ creature, encounter, onSelect }) {
    const { mutate: addCreatureToEncounter } =
      useAddExistingCreatureAsParticipant(encounter);
    const isAlly = useAllyContext();
    const id = encounter.id;

    return (
      <div className="flex h-full flex-col">
        <AddCreatureButton
          creature={creature}
          key={creature.id}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) {
              return onSelect(creature);
            }
            addCreatureToEncounter({
              creature_id: creature.id,
              encounter_id: id,
              is_ally: isAlly ?? false,
            });
          }}
        >
          {creature.challenge_rating ? (
            <span className="grid grid-cols-2 text-gray-500">
              <span className="flex gap-2">
                <Skull />
                {creature.challenge_rating}
              </span>
              <span className="flex gap-2">
                <Heart />
                {creature.max_hp}
              </span>
            </span>
          ) : null}
        </AddCreatureButton>
      </div>
    );
  }
);
