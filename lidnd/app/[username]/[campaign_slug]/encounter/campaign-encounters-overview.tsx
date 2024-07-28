"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, MoreHorizontal, Plus, UserPlus } from "lucide-react";
import { api } from "@/trpc/react";
import { Encounter } from "@/server/api/router";
import { useCampaign } from "../hooks";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { PlayerUploadForm } from "@/app/[username]/[campaign_slug]/encounter/full-creature-add-form";
import { CreaturePost } from "@/app/[username]/[campaign_slug]/encounter/types";
import { dragTypes, typedDrag } from "@/app/[username]/utils";
import { getCreaturePostForm } from "@/app/[username]/[campaign_slug]/encounter/utils";
import { createPlayerAndAddToCampaign } from "@/app/[username]/actions";
import { Separator } from "@/components/ui/separator";
import { ParticipantUtils } from "@/utils/participants";
import clsx from "clsx";
import { Switch } from "@/components/ui/switch";
import { EncounterUtils } from "@/utils/encounters";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { CampaignDescriptionArea } from "@/app/[username]/campaign-description-area";
import { FadeInSuspense } from "@/components/ui/fade-in-suspense";
import _ from "lodash";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useUser } from "@/app/[username]/user-provider";
import { CreatureIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { useUpdateEncounter } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/hooks";
import { appRoutes } from "@/app/routes";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";

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

  const encountersByStatus = _.groupBy(encounters ?? [], (e) => e.label);

  function onPlayerUpload(data: CreaturePost) {
    const dataAsForm = getCreaturePostForm(data);
    dataAsForm.set("max_hp", "1");
    createPlayerAndAddToCampaign(campaignId, dataAsForm);
  }

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
  category: Encounter["label"];
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
          label: props.category,
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
      onDragLeave={() => {
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
      <ul className="flex flex-col bg-gray-50 p-1">
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
    placeholder: "Flow, terrain, monster strategy, etc...",
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
  encounter: Encounter;
  deleteEncounter: (id: string) => void;
  category: Encounter["label"];
  previousOrder: number;
  nextOrder: number;
}) {
  const { encounter, deleteEncounter, category, previousOrder, nextOrder } =
    props;
  const [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">(
    "none",
  );
  const { mutate: updateEncounter } = useUpdateEncounter();
  const user = useUser();
  const [campaign] = useCampaign();
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
          label: category,
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
          href={appRoutes.encounter(campaign, encounter, user)}
          className="flex hover:bg-gray-200 p-3 text-ellipsis  border-b relative group bg-gray-100"
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
    <div className={"flex gap-3 overflow-hidden"}>
      {participants?.map((p) => (
        <div className={"rounded-full w-12 h-12 flex items-center"}>
          <CreatureIcon
            key={p.id}
            creature={p.creature}
            size="small"
            objectFit="cover"
          />
        </div>
      ))}
    </div>
  );
}
