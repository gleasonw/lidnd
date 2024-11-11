"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as R from "remeda";
import React, { createContext, useContext, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Clock,
  Eye,
  GripVertical,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Skull,
  Smile,
  Trash,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { api } from "@/trpc/react";
import type { Encounter, EncounterWithParticipants } from "@/server/api/router";
import {
  useAddExistingToParty,
  useAddNewToParty,
  useCampaign,
  useRemoveFromParty,
  useUpdateCampaign,
} from "../hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";
import {
  CompactMonsterUploadForm,
  MonsterUploadForm,
  PlayerUploadForm,
} from "@/encounters/full-creature-add-form";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { EncounterUtils } from "@/utils/encounters";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useUser } from "@/app/[username]/user-provider";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  useCreateCreatureInEncounter,
  useDeleteEncounter,
  useEncounterQueryUtils,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { appRoutes } from "@/app/routes";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebouncedCallback } from "use-debounce";
import { compareCreatedAt, formatSeconds } from "@/lib/utils";
import { EncounterDifficulty } from "@/encounters/[encounter_index]/encounter-top-bar";
import { makeAutoObservable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { LidndPopover } from "@/encounters/base-popover";
import {
  ExistingMonster,
  ParticipantUpload,
} from "@/encounters/[encounter_index]/participant-add-form";
import type { CampaignWithData } from "@/server/campaigns";

export function ExistingCreaturesForPartyAdd() {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const campaignId = useCampaignId();
  const { mutate: addCreature } = useAddExistingToParty();
  const creaturesPlayersFirst = R.sort(creatures ?? [], (a, b) =>
    a.is_player ? -1 : b.is_player ? 1 : 0,
  );
  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Search..."
        type="text"
        onChange={(e) => setName(e.target.value)}
        value={name}
      />
      <div className={"flex flex-col gap-2 h-96 overflow-auto"}>
        {creaturesPlayersFirst?.map((creature) => (
          <Button
            key={creature.id}
            variant="ghost"
            onClick={() =>
              addCreature({ player: creature, campaign_id: campaignId })
            }
            className="flex w-full items-center justify-between"
          >
            <span>{creature.name}</span>
            <CreatureIcon creature={creature} size="small" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CampaignParty({ campaign }: { campaign: CampaignWithData }) {
  const playersInCampaign = campaign?.campaignToPlayers;
  const { mutate: removePlayer } = useRemoveFromParty(campaign);

  const { mutate: onPlayerUpload } = useAddNewToParty(campaign);
  const { mutate: updateCampaign } = useUpdateCampaign(campaign);
  const [partyLevel, setPartyLevel] = React.useState(
    campaign?.party_level ?? 1,
  );
  const [isEditingParty, setIsEditingParty] = React.useState(false);

  const handlePartyLevelChange = useDebouncedCallback((level: string) => {
    const stringAsInt = parseInt(level);
    if (!isNaN(stringAsInt)) {
      updateCampaign({
        ...campaign,
        party_level: Math.max(1, stringAsInt),
      });
    }
  });

  return (
    <div className="flex gap-5">
      <div className="flex">
        {playersInCampaign.map(({ player }) => (
          <div
            key={player.id}
            className="flex flex-col justify-center items-center"
          >
            <CreatureIcon
              key={player.id}
              creature={player}
              size="v-small"
              objectFit="contain"
            />
            {isEditingParty ? (
              <span className="flex gap-2 items-center w-full justify-between">
                <ButtonWithTooltip
                  variant="ghost"
                  text="Delete"
                  className="opacity-25"
                  onClick={() => removePlayer(player.id)}
                >
                  <X />
                </ButtonWithTooltip>
              </span>
            ) : null}
          </div>
        ))}
        <ButtonWithTooltip
          text={isEditingParty ? "Done" : "Edit party"}
          variant="ghost"
          onClick={() => setIsEditingParty(!isEditingParty)}
        >
          {isEditingParty ? <Eye /> : <Pencil />}
        </ButtonWithTooltip>
        {isEditingParty ? (
          <LidndDialog
            title={"Add new party member"}
            trigger={
              <ButtonWithTooltip text="Add new party member" variant="ghost">
                <UserPlus />
              </ButtonWithTooltip>
            }
            content={
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
                  <Tabs defaultValue="player">
                    <TabsList>
                      <TabsTrigger value="player" className="flex gap-3">
                        <User /> Player
                      </TabsTrigger>
                      <TabsTrigger value="npc" className="flex gap-3">
                        <Smile /> NPC
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="npc">
                      <MonsterUploadForm uploadCreature={onPlayerUpload} />
                    </TabsContent>
                    <TabsContent value="player">
                      <PlayerUploadForm uploadCreature={onPlayerUpload} />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                <TabsContent value="existing">
                  <ExistingCreaturesForPartyAdd />
                </TabsContent>
              </Tabs>
            }
          />
        ) : null}
      </div>
      <label className="flex gap-2 items-center font-light whitespace-nowrap">
        Level
        <Input
          type="number"
          className="w-16"
          value={partyLevel}
          onChange={(e) => {
            setPartyLevel(Math.max(1, parseInt(e.target.value)));
            handlePartyLevelChange(e.target.value);
          }}
        />
      </label>
    </div>
  );
}

export function SessionEncounters() {
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { encountersInCampaign: encounters } = api.useUtils();
  const { data: campaignEncounters } =
    api.encountersInCampaign.useQuery(campaignId);
  const activeEncounters = campaignEncounters
    ? R.sort(
        EncounterUtils.byStatus(campaignEncounters).active ?? [],
        compareCreatedAt,
      )
    : [];

  const [campaign] = useCampaign();
  const lastOrder = activeEncounters?.length
    ? (R.firstBy(activeEncounters, [(e) => e.order, "desc"])?.order ?? 1) + 1
    : 1;
  const { mutate: removeEncountersFromSession } =
    api.removeEncountersFromSession.useMutation({
      onSettled: async () => {
        return await encounters.invalidate(campaignId);
      },
      onMutate: async (ids) => {
        await encounters.cancel(campaignId);
        const previous = encounters.getData(campaignId);
        encounters.setData(campaignId, (old) => {
          if (!old) return old;
          return old.map((e) => {
            if (ids.includes(e.id)) {
              return { ...e, label: "inactive" };
            }
            return e;
          });
        });
        return { previous };
      },
    });

  const sumActiveDuration = R.sumBy(activeEncounters, (e) =>
    EncounterUtils.durationSeconds(e, {
      playerLevel: campaign?.party_level,
    }),
  );

  return (
    <div
      key={"active"}
      onDrop={(e) => {
        if (!acceptDrop) {
          return;
        }
        const encounter = typedDrag.get(e.dataTransfer, dragTypes.encounter);
        if (!encounter) {
          console.error("No encounter found when dragging");
          return;
        }
        updateEncounter({
          id: encounter.id,
          label: "active",
          order: lastOrder,
        });
        setAcceptDrop(false);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        if (!typedDrag.includes(e.dataTransfer, dragTypes.encounter)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setAcceptDrop(true);
      }}
      onDragLeave={() => {
        setAcceptDrop(false);
      }}
      className={clsx(
        "flex-col flex w-full gap-3 transition-all rounded-sm max-h-full",
      )}
    >
      <div className="flex justify-between items-center w-full">
        <span className="text-lg text-gray-900 font-bold">Session docket</span>
        <span className="opacity-50 flex items-center gap-2 text-sm ml-auto">
          <Clock className="text-4xl" />
          <span>Est. duration:</span>
          {formatSeconds(sumActiveDuration)}
        </span>
        <Button
          variant="ghost"
          className="text-blue-500"
          onClick={() =>
            removeEncountersFromSession(activeEncounters.map((e) => e.id))
          }
        >
          Remove all
        </Button>
      </div>

      <ul
        className={clsx(
          "flex overflow-auto max-h-full p-2 gap-2 border-2 border-dashed h-32 items-center",

          {
            "border-black": acceptDrop,
            "items-center justify-center": activeEncounters?.length === 0,
            "border-transparent": activeEncounters?.length > 0 && !acceptDrop,
          },
        )}
      >
        {activeEncounters?.length === 0
          ? "Drop encounters here to plan session"
          : null}
        {activeEncounters?.map((encounter, index) => {
          const priorEncounter = activeEncounters[index - 1];
          const nextEncounter = activeEncounters[index + 1];

          return (
            <DraggableEncounterCard
              encounter={encounter}
              category={"active"}
              previousOrder={
                priorEncounter ? priorEncounter.order : encounter.order - 1
              }
              nextOrder={
                nextEncounter ? nextEncounter.order : encounter.order + 1
              }
              key={encounter.id}
              encounterCard={
                <Card
                  className={clsx(
                    "flex transition-all p-4 gap-3 justify-between items-center max-w-sm",
                  )}
                  draggable
                  onDragStart={(e) => {
                    typedDrag.set(
                      e.dataTransfer,
                      dragTypes.encounter,
                      encounter,
                    );
                  }}
                >
                  <GripVertical className="text-gray-500" />
                  <h2 className={"w-full flex justify-between items-center"}>
                    <span className="max-w-full truncate text-lg">
                      {encounter.name ? encounter.name : "Unnamed"}
                    </span>
                    <MonstersInEncounter id={encounter.id} />
                    <DifficultyBadge encounter={encounter} />
                  </h2>
                </Card>
              }
            />
          );
        })}
      </ul>
    </div>
  );
}

class EncounterArchiveStore {
  editingEncounters: Set<string> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  setEditingEncounter(encounterId: string) {
    this.editingEncounters.add(encounterId);
  }

  setDoneEditingEncounter(encounterId: string) {
    this.editingEncounters.delete(encounterId);
  }
}

const EncounterArchiveContext = createContext<EncounterArchiveStore | null>(
  null,
);
const useEncounterArchive = () => {
  const store = useContext(EncounterArchiveContext);
  if (!store) {
    throw new Error(
      "useEncounterArchive must be used within a EncounterArchiveProvider",
    );
  }
  return store;
};

export function EncounterArchive() {
  const archiveStore = useMemo(() => new EncounterArchiveStore(), []);
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { data: encounters } = api.encountersInCampaign.useQuery(campaignId);
  const inactiveEncounters = encounters
    ? R.sort(encounters, compareCreatedAt).reverse()
    : [];

  const lastOrder = inactiveEncounters?.length
    ? (R.firstBy(inactiveEncounters, [(e) => e.order, "desc"])?.order ?? 1) + 1
    : 1;

  return (
    <div className="flex max-h-full h-full flex-col gap-5 overflow-hidden">
      <EncounterArchiveContext.Provider value={archiveStore}>
        <h1 className={"text-2xl gap-5 flex items-center"}>
          <Skull />
          <span className="py-2 text-xl">Encounters</span>
          <CreateEncounterButton />
        </h1>
        <ScrollArea
          key={"inactive"}
          onDrop={(e) => {
            if (!acceptDrop) {
              return;
            }
            const encounter = typedDrag.get(
              e.dataTransfer,
              dragTypes.encounter,
            );
            if (!encounter) {
              console.error("No encounter found when dragging");
              return;
            }
            updateEncounter({
              id: encounter.id,
              label: "inactive",
              order: lastOrder,
            });
            setAcceptDrop(false);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragOver={(e) => {
            if (!typedDrag.includes(e.dataTransfer, dragTypes.encounter)) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            setAcceptDrop(true);
          }}
          onDragLeave={() => {
            setAcceptDrop(false);
          }}
          className={clsx(
            {
              "border-black": acceptDrop,
              "border-transparent": !acceptDrop,
            },
            "border-2 border-dashed flex flex-col w-full transition-all rounded-md max-h-full overflow-auto h-full",
          )}
        >
          <InactiveEncounterList />
        </ScrollArea>
      </EncounterArchiveContext.Provider>
    </div>
  );
}

export function EditingEncounterCard() {
  const campaignId = useCampaignId();
  const [campaign] = useCampaign();
  const { data: encounters } = api.encountersInCampaign.useQuery(campaignId);
  const focusedEncounter =
    encounters?.find((e) => e.id === campaign.focused_encounter_id) ??
    encounters?.[0] ??
    null;
  if (!focusedEncounter) {
    return null;
  }
  return (
    <EditEncounter key={focusedEncounter.id} encounter={focusedEncounter} />
  );
}

function EditEncounter({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const debouncedNameUpdate = useDebouncedCallback((name: string) => {
    updateEncounter({
      ...encounter,
      name,
    });
  }, 500);
  const debouncedDescriptionUpdate = useDebouncedCallback(
    (description: string) => {
      updateEncounter({
        ...encounter,
        description,
      });
    },
    500,
  );
  const { mutate: updateEncounter } = useUpdateEncounter();

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Objectives, monster tactics, etc...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: description,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setDescription(content);
      debouncedDescriptionUpdate(content);
    },
  });
  const monsters = encounter.participants.filter((p) =>
    ParticipantUtils.isAdversary(p),
  );
  const { mutate: deleteEncounter } = useDeleteEncounter();
  const { encounterById } = api.useUtils();
  const { invalidateAll, cancelAll } = useEncounterQueryUtils();
  const { mutate: removeParticipant } =
    api.removeParticipantFromEncounter.useMutation({
      onMutate: async (data) => {
        await cancelAll(encounter);
        const previousEncounterData = encounterById.getData(encounter.id);
        encounterById.setData(encounter.id, (old) => {
          if (!old) {
            return;
          }

          const removedParticipant = old.participants.find(
            (p) => p.id === data.participant_id,
          );

          if (!removedParticipant) {
            throw new Error("No participant found when removing");
          }

          return EncounterUtils.removeParticipant(data.participant_id, old);
        });
        return { previousEncounterData };
      },
      onSettled: async () => {
        return await invalidateAll(encounter);
      },
    });
  const { mutate: createCreatureInEncounter } = useCreateCreatureInEncounter({
    encounter,
  });

  return (
    <Card className="w-full h-full max-h-full flex flex-col gap-8 p-5 relative shadow-lg overflow-auto">
      <div className="flex w-full items-center gap-2 justify-between">
        <LidndTextInput
          value={name}
          variant="ghost"
          placeholder={encounter.name ?? "Unnamed encounter"}
          className="max-w-sm text-lg"
          onChange={(e) => {
            setName(e.target.value);
            debouncedNameUpdate(e.target.value);
          }}
        />
        <LidndPopover trigger={<MoreVertical />}>
          <Button
            variant="ghost"
            className="text-red-500"
            onClick={() => {
              deleteEncounter(encounter.id);
            }}
          >
            Delete encounter
            <Trash />
          </Button>
        </LidndPopover>
      </div>
      <LidndTextArea placeholder="Encounter description" editor={editor} />
      <EncounterDifficulty encounter={encounter} />
      <div className="flex flex-wrap gap-3 items-center">
        {monsters.map((m) => (
          <div
            key={m.id}
            className=" flex flex-wrap items-center gap-5 h-12 p-1 rounded-full bg-gray-100 "
          >
            <CreatureIcon creature={m.creature} size={"v-small"} />
            <span className="truncate">{m.creature.name}</span>
            <span className="truncate text-gray-500">
              CR {m.creature.challenge_rating}
            </span>
            <ButtonWithTooltip
              text="Remove"
              variant="ghost"
              className="text-gray-300"
            >
              <Trash
                onClick={() =>
                  removeParticipant({
                    encounter_id: encounter.id,
                    participant_id: m.id,
                  })
                }
              />
            </ButtonWithTooltip>
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 max-h-full overflow-hidden">
        <ParticipantUpload
          encounter={encounter}
          form={
            <CompactMonsterUploadForm
              uploadCreature={(creature) =>
                createCreatureInEncounter({
                  creature,
                  participant: { is_ally: false },
                })
              }
            />
          }
          existingCreatures={<ExistingMonster encounter={encounter} />}
        />
      </div>
    </Card>
  );
}

export function DifficultyBadge({
  encounter,
}: {
  encounter: EncounterWithParticipants;
}) {
  const [campaign] = useCampaign();
  const diffColor = EncounterUtils.difficultyColor(encounter, campaign);
  return (
    <Badge
      className={`bg-${diffColor}-100 text-${diffColor}-700 flex-grow-0 h-5 ml-auto rounded-sm`}
    >
      {EncounterUtils.difficulty(encounter, campaign?.party_level)}
    </Badge>
  );
}

const InactiveEncounterList = observer(function InactiveEncounterList() {
  const campaignId = useCampaignId();
  const { data: encounters } = api.encountersInCampaign.useQuery(campaignId);
  const inactiveEncounters = encounters
    ? R.sort(encounters, compareCreatedAt).reverse()
    : [];

  const [campaign] = useCampaign();
  const user = useUser();
  const { mutate: updateCampaign } = useUpdateCampaign(campaign);
  return (
    <ul className="flex flex-col gap-3">
      {inactiveEncounters?.length === 0 ? (
        <EncounterSkeleton unmoving>No encounters</EncounterSkeleton>
      ) : null}
      {inactiveEncounters?.map((encounter, index) => {
        const priorEncounter = inactiveEncounters[index - 1];
        const nextEncounter = inactiveEncounters[index + 1];

        return (
          <DraggableEncounterCard
            encounter={encounter}
            category={"inactive"}
            previousOrder={
              priorEncounter ? priorEncounter.order : encounter.order - 1
            }
            nextOrder={
              nextEncounter ? nextEncounter.order : encounter.order + 1
            }
            key={encounter.id}
            encounterCard={
              <Card
                className={clsx(
                  "flex flex-col transition-all w-full p-3 gap-3",
                )}
                draggable
                onDragStart={(e) => {
                  typedDrag.set(e.dataTransfer, dragTypes.encounter, encounter);
                }}
                onClick={() => {
                  updateCampaign({
                    ...campaign,
                    focused_encounter_id: encounter.id,
                  });
                }}
              >
                <div className="flex flex-col">
                  <div className="flex items-center text-gray-500">
                    <GripVertical className="flex-shrink-0 flex-grow-0" />
                    <Link href={appRoutes.encounter(campaign, encounter, user)}>
                      <ButtonWithTooltip
                        text="View"
                        variant="ghost"
                        size={"sm"}
                      >
                        <Play />
                      </ButtonWithTooltip>
                    </Link>
                    <DifficultyBadge encounter={encounter} />
                  </div>
                  <h2 className={"flex items-center"}>
                    <span className="max-w-full truncate">
                      {encounter.name ? encounter.name : "Unnamed"}
                    </span>
                  </h2>
                </div>

                <MonstersInEncounter id={encounter.id} />
              </Card>
            }
          />
        );
      })}
    </ul>
  );
});

export function CreateEncounterButton() {
  const { encountersInCampaign: encounters } = api.useUtils();
  const [campaign] = useCampaign();
  const { mutate: createDefaultEncounter } = api.createEncounter.useMutation({
    onMutate: async (newEncounter) => {
      await encounters.cancel(campaign.id);
      const previous = encounters.getData(campaign.id);
      encounters.setData(campaign.id, (old) => {
        if (!old) return [];
        const placeholder = EncounterUtils.placeholder(newEncounter);
        return [...old, { ...placeholder, participants: [] }];
      });
      return { previous };
    },
    onSuccess: async (encounter) => {
      return await encounters.invalidate();
    },
    onError: (err, newEn, context) => {
      encounters.setData(campaign.id, context?.previous);
    },
  });
  const encounterUuid = crypto.randomUUID();
  const archiveStore = useEncounterArchive();
  return (
    <ButtonWithTooltip
      text="Create encounter"
      variant="ghost"
      onClick={() => {
        runInAction(() => archiveStore.setEditingEncounter(encounterUuid));
        createDefaultEncounter({
          name: "",
          description: "",
          campaign_id: campaign.id,
          label: "inactive",
          id: encounterUuid,
        });
      }}
    >
      <Plus />
    </ButtonWithTooltip>
  );
}

function EncounterSkeleton({
  unmoving = false,
  children,
}: {
  unmoving?: boolean;
  children?: React.ReactNode;
}) {
  if (unmoving) {
    return (
      <div className="flex flex-col transition-all w-full h-44 items-center justify-center">
        {children}
      </div>
    );
  }
  return (
    <Card className="flex flex-col transition-all w-full h-44 animate-pulse bg-gray-200" />
  );
}

function DraggableEncounterCard(props: {
  encounter: EncounterWithParticipants;
  category: Encounter["label"];
  previousOrder: number;
  nextOrder: number;
  encounterCard: React.ReactNode;
}) {
  const { encounter, category, previousOrder, nextOrder } = props;
  const [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">(
    "none",
  );
  const { mutate: updateEncounter } = useUpdateEncounter();
  return (
    <li
      onDrop={(e) => {
        const droppedEncounter = typedDrag.get(
          e.dataTransfer,
          dragTypes.encounter,
        );
        if (!droppedEncounter) {
          console.error("No encounter found when dragging");
          return;
        }
        const updateOrder = acceptDrop === "bottom" ? nextOrder : previousOrder;
        updateEncounter({
          id: droppedEncounter.id,
          label: category,
          order: (encounter.order + updateOrder) / 2,
        });
        setAcceptDrop("none");
      }}
      key={encounter.id}
      className={clsx("transition-all -mb-[2px] flex-grow-0 cursor-grab")}
    >
      {props.encounterCard}
    </li>
  );
}

export function MonstersInEncounter({ id }: { id: string }) {
  const campaignId = useCampaignId();
  const { data: encounters } = api.encountersInCampaign.useQuery(campaignId);

  const participants = encounters
    ?.find((encounter) => encounter.id === id)
    ?.participants.filter((p) => !ParticipantUtils.isPlayer(p));

  return (
    <div className={"flex overflow-hidden pointer-events-none"}>
      {participants?.map((p) => (
        <div
          className={"rounded-full w-12 h-12 flex items-center overflow-hidden"}
          key={p.id}
        >
          <CreatureIcon creature={p.creature} size="v-small" />
        </div>
      ))}
    </div>
  );
}
