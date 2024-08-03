"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as R from "remeda";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Plus, Smile, Trash, User, UserPlus, X } from "lucide-react";
import { api } from "@/trpc/react";
import type { Encounter, EncounterWithParticipants } from "@/server/api/router";
import {
  useAddExistingToParty,
  useAddNewToParty,
  useCampaign,
  useRemoveFromParty,
} from "../hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import {
  MonsterUploadForm,
  PlayerUploadForm,
} from "@/encounters/full-creature-add-form";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { Separator } from "@/components/ui/separator";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { Switch } from "@/components/ui/switch";
import { EncounterUtils } from "@/utils/encounters";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CampaignDescriptionArea } from "@/app/[username]/campaign-description-area";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useUser } from "@/app/[username]/user-provider";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { useUpdateEncounter } from "@/encounters/[encounter_index]/hooks";
import { appRoutes } from "@/app/routes";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
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

export interface CampaignEncountersProps {
  deleteCampaignButton: React.ReactNode;
  campaignHeader: React.ReactNode;
}

export default function CampaignEncountersOverview(
  props: CampaignEncountersProps,
) {
  const { campaignHeader } = props;

  return (
    <FadeInSuspense
      fallback={
        <div className="w-full pt-10 flex justify-center">
          Loading campaign...
        </div>
      }
      wrapperClassName="flex h-full overflow-hidden"
    >
      <div className="flex flex-col gap-5 h-full overflow-auto w-full">
        {campaignHeader}
        <CampaignDescriptionArea
          tiptapReadyGate={
            <>
              <span className="flex gap-5 items-center">
                <CampaignPlayers />
              </span>
              <Separator />
              <h1 className={"text-2xl flex items-center"}>
                <span className="py-2 text-xl">Encounters</span>
                <CreateEncounterButton category={"active"} />
              </h1>
              <div className="flex flex-col gap-5">
                <SessionEncounters />
                <EncounterArchive />
              </div>
            </>
          }
        />
      </div>
    </FadeInSuspense>
  );
}

function ExistingCreaturesForPartyAdd() {
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

function CampaignPlayers() {
  const [campaign] = useCampaign();
  const playersInCampaign = campaign?.campaignToPlayers;
  const { mutate: removePlayer } = useRemoveFromParty();

  const { mutate: onPlayerUpload } = useAddNewToParty();

  return (
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
      ))}
      <LidndDialog
        trigger={
          <Card className="flex h-12 w-80">
            <ButtonWithTooltip
              text="Add new party member"
              variant="ghost"
              className="w-full h-full"
            >
              <UserPlus />
            </ButtonWithTooltip>
          </Card>
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
  );
}

function SessionEncounters() {
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { data: encounters } = api.encounters.useQuery(campaignId);
  const activeEncounters = encounters
    ? R.sort(
        EncounterUtils.byStatus(encounters).active ?? [],
        (a, b) => a.order - b.order,
      )
    : [];

  const lastOrder = activeEncounters?.length
    ? (R.firstBy(activeEncounters, [(e) => e.order, "desc"])?.order ?? 1) + 1
    : 1;

  return (
    <div>
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
            "border-transparent": !acceptDrop,
          },
          "border-2 border-dashed flex w-full flex-col transition-all rounded-md  bg-gray-100 ",
        )}
      >
        <ul className="flex flex-wrap p-1">
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
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function EncounterArchive() {
  const campaignId = useCampaignId();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: updateEncounter } = useUpdateEncounter();
  const { data: encounters } = api.encounters.useQuery(campaignId);
  const inactiveEncounters = encounters
    ? R.sort(
        EncounterUtils.byStatus(encounters).inactive ?? [],
        (a, b) => a.order - b.order,
      )
    : [];

  const lastOrder = inactiveEncounters?.length
    ? (R.firstBy(inactiveEncounters, [(e) => e.order, "desc"])?.order ?? 1) + 1
    : 1;

  return (
    <div>
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
          "border-2 border-dashed flex flex-col w-full transition-all rounded-md ",
        )}
      >
        <ul className="flex flex-wrap ">
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
              />
            );
          })}
        </ul>
      </section>
    </div>
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
          variant="ghost"
          text="Create encounter"
          onClick={() => setDialogIsOpen(true)}
        >
          <Plus />
        </ButtonWithTooltip>
      </DialogTrigger>
      <DialogContent>
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
                  placeholder="Create more"
                  defaultChecked={createMore}
                  onCheckedChange={(checked) => setCreateMore(checked)}
                />
                <span>Create more</span>
              </label>
              <Button type="submit">Create encounter</Button>
              {isPending && <Spinner />}
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
}) {
  const { encounter, category, previousOrder, nextOrder } = props;
  const [acceptDrop, setAcceptDrop] = useState<"none" | "left" | "right">(
    "none",
  );
  const { mutate: updateEncounter } = useUpdateEncounter();
  const user = useUser();
  const [campaign] = useCampaign();
  const { data: settings } = api.settings.useQuery();
  const encounterDifficulty = EncounterUtils.difficulty(
    encounter,
    settings?.default_player_level,
  );
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
        const updateOrder = acceptDrop === "right" ? nextOrder : previousOrder;
        updateEncounter({
          id: droppedEncounter.id,
          label: category,
          order: (encounter.order + updateOrder) / 2,
        });
        setAcceptDrop("none");
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
        const currentBounds = e.currentTarget.getBoundingClientRect();
        const midpoint = (currentBounds.left + currentBounds.right) / 2;
        setAcceptDrop(e.clientX <= midpoint ? "left" : "right");
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setAcceptDrop("none");
      }}
      key={encounter.id}
      className={clsx(
        {
          "border-l-transparent border-r-gray-400": acceptDrop === "right",
          "border-r-transparent border-l-gray-400": acceptDrop === "left",
          "border-l-transparent border-r-transparent": acceptDrop === "none",
        },
        "transition-all border-l-2 border-r-2 -mb-[2px] p-4 flex-grow-0",
      )}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <Link
            href={appRoutes.encounter(campaign, encounter, user)}
            className=""
          >
            <Card
              className={clsx(
                "flex flex-col transition-all cursor-grab h-32 w-80 p-4 gap-3",
              )}
              draggable
              onDragStart={(e) => {
                typedDrag.set(e.dataTransfer, dragTypes.encounter, encounter);
              }}
            >
              <MonstersInEncounter id={encounter.id} />
              <h2 className={"w-full flex justify-between items-center"}>
                <span className="max-w-full truncate text-lg">
                  {encounter.name ? encounter.name : "Unnamed"}
                </span>
                {settings && (
                  <Badge
                    className={clsx({
                      "bg-red-500": encounterDifficulty === "Deadly",
                      "bg-yellow-500": encounterDifficulty === "Hard",
                      "bg-green-500": encounterDifficulty === "Easy",
                      "bg-blue-500": encounterDifficulty === "Standard",
                    })}
                  >
                    {encounterDifficulty}
                  </Badge>
                )}
              </h2>
            </Card>
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

function MonstersInEncounter({ id }: { id: string }) {
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
