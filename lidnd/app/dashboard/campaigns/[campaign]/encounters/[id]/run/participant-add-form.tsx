import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CharacterIcon } from "@/encounters/[id]/character-icon";
import {
  useAddExistingCreatureToEncounter,
  useCreateCreatureInEncounter,
  useEncounterId,
} from "@/encounters/[id]/hooks";
import { FullCreatureAddForm } from "@/encounters/full-creature-add-form";
import { ParticipantPost } from "@/encounters/types";
import { Creature } from "@/server/api/router";
import { api } from "@/trpc/react";
import { Heart, Plus, Skull, UserPlus } from "lucide-react";
import { autorun, makeAutoObservable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import React, { Suspense, useMemo, useState } from "react";

class ParticipantToAdd {
  isAlly = false;

  constructor() {
    makeAutoObservable(this);
  }
}

const ParticipantContext = React.createContext<ParticipantToAdd | null>(null);
const useParticipantContext = () => {
  const context = React.useContext(ParticipantContext);
  if (!context) {
    throw new Error(
      "useParticipantContext must be used within a ParticipantContextProvider",
    );
  }
  return context;
};

export const ParticipantUpload = observer(function ParticipantUpload() {
  const { mutate: addCreatureToEncounter } = useCreateCreatureInEncounter();

  const store = useMemo(() => new ParticipantToAdd(), []);
  const { isAlly } = store;
  return (
    <ParticipantContext.Provider value={store}>
      <label>
        Add as ally
        <Checkbox
          checked={isAlly}
          onCheckedChange={(checked) =>
            runInAction(() => {
              store.isAlly = checked !== "indeterminate" && checked;
            })
          }
        />
      </label>
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">
            <Plus /> Add new creature
          </TabsTrigger>
          <TabsTrigger value="existing">
            <UserPlus /> Existing creatures
          </TabsTrigger>
        </TabsList>
        <TabsContent value="new">
          <CardContent className={"flex flex-col gap-6 pt-5"}>
            <CardTitle>New creature</CardTitle>
            <FullCreatureAddForm
              uploadCreature={(data) =>
                addCreatureToEncounter({
                  creature: data,
                  participant: {
                    is_ally: isAlly,
                  },
                })
              }
            />
          </CardContent>
        </TabsContent>
        <TabsContent value="existing">
          <CardContent className={"flex flex-col gap-3 pt-5 max-h-full"}>
            <CardTitle>Existing creature</CardTitle>
            <ExistingCreature />
          </CardContent>
        </TabsContent>
      </Tabs>
    </ParticipantContext.Provider>
  );
});

export function ExistingCreature({ children }: { children?: React.ReactNode }) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });

  return (
    <>
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
    </>
  );
}

export interface ListedCreatureProps {
  creature: Creature;
}

export const ListedCreature = observer<ListedCreatureProps>(
  function ListedCreature({ creature }) {
    const { mutate: addCreature, isLoading: isAddingExistingCreature } =
      useAddExistingCreatureToEncounter();

    const { isAlly } = useParticipantContext();
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
              addCreature({
                creature_id: creature.id,
                encounter_id: id,
                is_ally: isAlly,
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
