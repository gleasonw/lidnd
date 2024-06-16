"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { CharacterIcon } from "./[id]/character-icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, MoreHorizontal, Plus, UserPlus } from "lucide-react";
import { api } from "@/trpc/react";
import { Encounter } from "@/server/api/router";
import { useCampaignId } from "../hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { PlayerUploadForm } from "@/encounters/full-creature-add-form";
import { CreaturePost } from "@/encounters/types";
import { dragTypes, typedDrag } from "@/app/dashboard/utils";
import { getCreaturePostForm } from "@/encounters/utils";
import { createPlayerAndAddToCampaign } from "@/app/dashboard/actions";
import { Separator } from "@/components/ui/separator";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { useUpdateEncounter } from "@/encounters/[id]/hooks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EncounterUtils } from "@/utils/encounters";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CampaignDescriptionArea } from "@/app/dashboard/campaign-description-area";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";

export interface CampaignEncountersProps {
  deleteCampaignButton: React.ReactNode;
  playersDisplay: React.ReactNode;
  campaignHeader: React.ReactNode;
}

export default function CampaignEncountersOverview(
  props: CampaignEncountersProps,
) {
  const { playersDisplay, campaignHeader } = props;
  const campaignId = useCampaignId();
  const { data: encounters } = api.encounters.useQuery(campaignId);

  const encountersByStatus = Object.groupBy(encounters ?? [], (e) => e.status);

  function onPlayerUpload(data: CreaturePost) {
    const dataAsForm = getCreaturePostForm(data);
    createPlayerAndAddToCampaign(campaignId, dataAsForm);
  }

  return (
    <FadeInSuspense
      fallback={
        <div className="w-full pt-10 flex justify-center">
          Loading campaign...
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {campaignHeader}
        <CampaignDescriptionArea
          tiptapReadyGate={
            <>
              <span className="flex gap-5 items-center">
                {playersDisplay}
                <LidndDialog
                  trigger={
                    <ButtonWithTooltip text="Add new player" variant="outline">
                      <UserPlus />
                    </ButtonWithTooltip>
                  }
                  content={<PlayerUploadForm uploadCreature={onPlayerUpload} />}
                />
              </span>
              <Separator />
              <div className="flex flex-row gap-10">
                <EncounterSection
                  name="Active"
                  category="active"
                  encounters={encountersByStatus.active ?? []}
                />
                <EncounterSection
                  name="Inactive"
                  category="inactive"
                  encounters={encountersByStatus.inactive ?? []}
                />
              </div>
            </>
          }
        />
      </div>
    </FadeInSuspense>
  );
}

function EncounterSection(props: {
  name: string;
  encounters: Encounter[];
  category: Encounter["status"];
}) {
  const campaignId = useCampaignId();
  const { encounters: encountersQuery } = api.useUtils();
  const [acceptDrop, setAcceptDrop] = useState(false);
  const { mutate: deleteEncounter } = api.deleteEncounter.useMutation({
    onSettled: async () => {
      await encountersQuery.invalidate();
    },
    onMutate: async (id) => {
      await encountersQuery.cancel();
      const previous = encountersQuery.getData();
      encountersQuery.setData(campaignId, (old) => {
        return old?.filter((encounter) => encounter.id !== id);
      });
      return { previous };
    },
  });
  const { mutate: updateEncounter } = useUpdateEncounter();

  return (
    <section
      key={props.name}
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
          status: props.category,
          order: 0,
        });
        setAcceptDrop(false);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragOver={(e) => {
        if (
          !typedDrag.includes(e.dataTransfer, dragTypes.encounter) ||
          props.encounters?.length > 0
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setAcceptDrop(true);
      }}
      onDragLeave={(e) => {
        setAcceptDrop(false);
      }}
      className={clsx(
        {
          "border-black": acceptDrop,
          "border-transparent": !acceptDrop,
        },
        "border-2 border-dashed flex w-[348px] flex-col h-[800px] transition-all rounded-md",
      )}
    >
      <h1 className={"text-2xl flex justify-between"}>
        {props.name}

        <CreateEncounterButton category={props.category} />
      </h1>
      <ul className="flex flex-col bg-gray-50 p-1 rounded">
        {props.encounters?.length === 0 ? (
          <EncounterSkeleton unmoving>No encounters</EncounterSkeleton>
        ) : null}
        {props.encounters
          ?.toSorted((a, b) => a.order - b.order)
          .map((encounter, index) => {
            const priorEncounter = props.encounters.at(index - 1);
            const nextEncounter = props.encounters.at(index + 1);

            return (
              <DraggableEncounterCard
                encounter={encounter}
                category={props.category}
                previousOrder={
                  priorEncounter ? priorEncounter.order : encounter.order - 1
                }
                nextOrder={
                  nextEncounter ? nextEncounter.order : encounter.order + 1
                }
                deleteEncounter={deleteEncounter}
                key={encounter.id}
              />
            );
          })}
      </ul>
    </section>
  );
}

export function CreateEncounterButton({
  className,
  category,
}: {
  className?: string;
  category: Encounter["status"];
}) {
  const { encounters } = api.useUtils();
  const campaignId = useCampaignId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);

  const { mutate: createDefaultEncounter } = api.createEncounter.useMutation({
    onMutate: async (newEncounter) => {
      await encounters.cancel(campaignId);
      const previous = encounters.getData(campaignId);
      encounters.setData(campaignId, (old) => {
        if (!old) return [];
        const placeholder = EncounterUtils.placeholder(newEncounter);
        return [...old, { ...placeholder, participants: [] }];
      });
      return { previous };
    },
    onSuccess: async () => {
      return await encounters.invalidate();
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
              campaign_id: campaignId,
              status: category,
            });
            setName("");
            setDescription("");

            if (createMore) {
              return;
            }

            setDialogIsOpen(false);
          }}
          className={"flex flex-col gap-5 pt-3"}
        >
          <Input
            placeholder="Encounter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            placeholder="Encounter description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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
  encounter: Encounter;
  deleteEncounter: (id: string) => void;
  category: Encounter["status"];
  previousOrder: number;
  nextOrder: number;
}) {
  const { encounter, deleteEncounter, category, previousOrder, nextOrder } =
    props;
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
        updateEncounter({
          id: droppedEncounter.id,
          status: category,
          order: acceptDrop === "top" ? previousOrder : nextOrder,
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
        const midpoint = (currentBounds.top + currentBounds.bottom) / 2;
        setAcceptDrop(e.clientY <= midpoint ? "top" : "bottom");
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setAcceptDrop("none");
      }}
      key={encounter.id}
      className={clsx(
        {
          "border-b-transparent border-t-gray-400": acceptDrop === "top",
          "border-t-transparent border-b-gray-400": acceptDrop === "bottom",
          "border-b-transparent border-t-transparent": acceptDrop === "none",
        },
        "transition-all border-b-2 border-t-2 -mb-[2px] p-4",
      )}
    >
      <Card
        className={clsx("flex flex-col transition-all cursor-grab h-32")}
        draggable
        onDragStart={(e) => {
          typedDrag.set(e.dataTransfer, dragTypes.encounter, encounter);
        }}
      >
        <Link
          draggable={false}
          href={EncounterUtils.dynamicRoute(encounter)}
          className="flex hover:bg-gray-200 p-3 text-ellipsis  border-b relative group bg-gray-100 rounded-t-lg"
        >
          <span
            className={
              "absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 text-white bg-black p-2 rounded-full transition-opacity"
            }
          >
            <ExternalLink />
          </span>

          <h2 className={"font-medium max-w-full truncate"}>
            {encounter.name ? encounter.name : "Unnamed"}
          </h2>
        </Link>
        <div className="p-3 flex flex-col relative gap-5">
          <Popover>
            <PopoverTrigger asChild className="absolute top-0 right-0">
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col gap-10">
              <Button
                variant="destructive"
                onClick={() => deleteEncounter(encounter.id)}
              >
                Delete encounter
              </Button>
            </PopoverContent>
          </Popover>
          <MonstersInEncounter id={encounter.id} />
        </div>
      </Card>
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
    <div className={"flex gap-3 flex-wrap"}>
      {participants?.map((p) => (
        <CharacterIcon
          id={p.creature_id}
          name={ParticipantUtils.name(p)}
          key={p.id}
          className={"rounded-full object-cover w-10 h-10"}
          width={100}
          height={100}
        />
      ))}
    </div>
  );
}
