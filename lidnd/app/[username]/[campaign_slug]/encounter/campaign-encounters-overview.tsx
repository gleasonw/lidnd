"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as R from "remeda";
import React, { useState } from "react";
import { Card, CardDescription } from "@/components/ui/card";
import {
  Clock,
  GripVertical,
  Plus,
  Smile,
  Trash,
  User,
  UserPlus,
  Users,
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle, DialogTrigger } from "@radix-ui/react-dialog";
import {
  MonsterUploadForm,
  PlayerUploadForm,
} from "@/encounters/full-creature-add-form";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { Switch } from "@/components/ui/switch";
import { EncounterUtils } from "@/utils/encounters";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useUser } from "@/app/[username]/user-provider";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { useUpdateEncounter } from "@/encounters/[encounter_index]/hooks";
import { appRoutes } from "@/app/routes";
import { useRouter } from "next/navigation";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useDebouncedCallback } from "use-debounce";
import { compareCreatedAt, formatSeconds } from "@/lib/utils";

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

export function CampaignParty() {
  const [campaign] = useCampaign();
  const playersInCampaign = campaign?.campaignToPlayers;
  const { mutate: removePlayer } = useRemoveFromParty();

  const { mutate: onPlayerUpload } = useAddNewToParty();
  const { mutate: updateCampaign } = useUpdateCampaign();
  const [partyLevel, setPartyLevel] = React.useState(
    campaign?.party_level ?? 1,
  );

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
    <div className="flex flex-col gap-5">
      <span className="flex gap-5 items-center">
        <Users />
        <span className="py-2 text-xl">Party</span>

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
      </span>
      <div className="flex flex-wrap gap-3">
        {playersInCampaign.map(({ player }) => (
          <Card
            className="flex gap-2 h-12 pl-5 w-80 overflow-hidden max-h-full"
            key={player.id}
          >
            <CreatureIcon
              key={player.id}
              creature={player}
              size="small"
              objectFit="contain"
            />
            <span className="flex gap-2 items-center w-full justify-between">
              <span className="truncate">{player.name}</span>
              <ButtonWithTooltip
                variant="ghost"
                text="Delete"
                className="opacity-25"
                onClick={() => removePlayer(player.id)}
              >
                <X />
              </ButtonWithTooltip>
            </span>
          </Card>
        ))}{" "}
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
      </div>
    </div>
  );
}

export function SessionEncounters() {
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { encounters } = api.useUtils();
  const { data: campaignEncounters } = api.encounters.useQuery(campaignId);
  const activeEncounters = campaignEncounters
    ? R.sort(
        EncounterUtils.byStatus(campaignEncounters).active ?? [],
        compareCreatedAt,
      )
    : [];

  const [campaign] = useCampaign();
  const { data: settings } = api.settings.useQuery();
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
    <section
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
        {
          "border-black": acceptDrop,
        },
        "border-2 col-span-1 border-dashed shadow-lg flex w-full flex-col transition-all rounded-sm p-3 max-h-full",
      )}
    >
      <div className="flex justify-between items-center">
        <span className="text-lg text-gray-900">Session docket</span>
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
      <div className="grid grid-cols-2 gap-5 max-h-full">
        <Card className="p-3 flex flex-col gap-2 text-sm">
          <span className="opacity-50 flex items-center gap-2">
            <Clock className="text-4xl" />
            Est. duration
          </span>
          {formatSeconds(sumActiveDuration)}
        </Card>
      </div>

      <ul className="flex flex-wrap p-1 flex-col sm:flex-row items-center overflow-auto max-h-full">
        {activeEncounters?.length === 0 ? (
          <EncounterSkeleton unmoving>No encounters</EncounterSkeleton>
        ) : null}
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
                    "flex flex-col transition-all h-32 w-64 sm:w-80 p-4 gap-3 justify-between",
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
                  <MonstersInEncounter id={encounter.id} />
                  <h2 className={"w-full flex justify-between items-center"}>
                    <span className="max-w-full truncate text-lg">
                      {encounter.name ? encounter.name : "Unnamed"}
                    </span>
                    {settings && (
                      <Badge
                        className={EncounterUtils.difficultyColor(
                          encounter,
                          campaign,
                        )}
                      >
                        {EncounterUtils.difficulty(
                          encounter,
                          campaign?.party_level,
                        )}
                      </Badge>
                    )}
                  </h2>
                </Card>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

export function EncounterArchive() {
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const [campaign] = useCampaign();
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { data: encounters } = api.encounters.useQuery(campaignId);
  const inactiveEncounters = encounters
    ? R.sort(
        EncounterUtils.byStatus(encounters).inactive ?? [],
        compareCreatedAt,
      )
    : [];

  const { data: settings } = api.settings.useQuery();
  const lastOrder = inactiveEncounters?.length
    ? (R.firstBy(inactiveEncounters, [(e) => e.order, "desc"])?.order ?? 1) + 1
    : 1;

  return (
    <section
      key={"inactive"}
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
      <ul className="flex flex-col">
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
                    "flex transition-all w-full p-4 h-20 gap-3 justify-between items-center",
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
                  <GripVertical className="flex-shrink-0 flex-grow-0 opacity-25" />
                  <h2 className={"flex items-center"}>
                    <span className="max-w-full truncate text-lg">
                      {encounter.name ? encounter.name : "Unnamed"}
                    </span>
                  </h2>
                  {settings && (
                    <Badge
                      className={`${EncounterUtils.difficultyColor(
                        encounter,
                        campaign,
                      )} flex-grow-0 h-5 rounded-sm`}
                    >
                      {EncounterUtils.difficulty(
                        encounter,
                        campaign?.party_level,
                      )}
                    </Badge>
                  )}
                  <CardDescription className="flex-grow-0 text-sm max-w-full truncate overflow-hidden max-h-full">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: encounter.description ?? "",
                      }}
                      className="max-w-full truncate max-h-full"
                    />
                  </CardDescription>
                  <div className="ml-auto">
                    <MonstersInEncounter id={encounter.id} />
                  </div>
                </Card>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

export function CreateEncounterButton({
  category,
}: {
  className?: string;
  category: Encounter["label"];
}) {
  const { encounters } = api.useUtils();
  const [campaign] = useCampaign();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const router = useRouter();
  const user = useUser();

  const { mutate: createDefaultEncounter, isPending } =
    api.createEncounter.useMutation({
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
        if (!createMore) {
          router.push(appRoutes.encounter(campaign, encounter, user));
        }

        return await encounters.invalidate();
      },
      onError: (err, newEn, context) => {
        encounters.setData(campaign.id, context?.previous);
      },
    });

  const configuredPlaceholder = Placeholder.configure({
    placeholder: "Objectives, monster tactics, etc...",
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredPlaceholder],
    content: description,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setDescription(content);
    },
  });

  return (
    <Dialog
      open={dialogIsOpen}
      onOpenChange={(isOpen) => setDialogIsOpen(isOpen)}
    >
      <DialogTrigger asChild>
        <ButtonWithTooltip
          variant="outline"
          text="Create encounter"
          onClick={() => setDialogIsOpen(true)}
        >
          <Plus />
        </ButtonWithTooltip>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create encounter</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDefaultEncounter({
              name,
              description,
              campaign_id: campaign.id,
              label: category,
            });
            setName("");
            setDescription("");
          }}
          className={"flex flex-col gap-5 pt-3"}
        >
          <LidndTextInput
            placeholder="Encounter name"
            value={name}
            variant="ghost"
            className="text-2xl"
            onChange={(e) => setName(e.target.value)}
          />
          <LidndTextArea placeholder="Encounter description" editor={editor} />
          <div className="flex justify-between items-center">
            <div className="ml-auto flex gap-2 items-center">
              <label className="flex gap-2">
                <Switch
                  defaultChecked={createMore}
                  onCheckedChange={(checked) => setCreateMore(checked)}
                />
                <span>Create more</span>
              </label>
              <Button type="submit">
                {isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const user = useUser();
  const [campaign] = useCampaign();
  const { encounters: encountersQuery } = api.useUtils();
  const { mutate: deleteEncounter } = api.deleteEncounter.useMutation({
    onSettled: async () => {
      await encountersQuery.invalidate();
    },
    onMutate: async (id) => {
      await encountersQuery.cancel();
      const previous = encountersQuery.getData();
      encountersQuery.setData(campaign.id, (old) => {
        return old?.filter((encounter) => encounter.id !== id);
      });
      return { previous };
    },
  });
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
      className={clsx("transition-all -mb-[2px] p-4 flex-grow-0")}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <Link
            href={appRoutes.encounter(campaign, encounter, user)}
            className=""
            prefetch={true}
          >
            {props?.encounterCard}
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => deleteEncounter(encounter.id)}
            className="flex gap-2 items-center"
          >
            Delete encounter
            <Trash className="opacity-50" />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}

export function MonstersInEncounter({ id }: { id: string }) {
  const campaignId = useCampaignId();
  const { data: encounters } = api.encounters.useQuery(campaignId);

  const participants = encounters
    ?.find((encounter) => encounter.id === id)
    ?.participants.filter((p) => !ParticipantUtils.isPlayer(p));

  return (
    <div className={"flex gap-3 overflow-hidden pointer-events-none"}>
      {participants?.map((p) => (
        <div className={"rounded-full w-12 h-12 flex items-center"} key={p.id}>
          <CreatureIcon creature={p.creature} size="small" objectFit="cover" />
        </div>
      ))}
    </div>
  );
}
