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
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCampaignId } from "../hooks";
import { routeToEncounter } from "@/app/routes";
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
    <div className="flex flex-col gap-5">
      {campaignHeader}
      <h1 className="text-xl">Players</h1>
      <span className="flex gap-5 items-center">
        {playersDisplay}
        <Dialog>
          <DialogTrigger asChild>
            <ButtonWithTooltip text="Add new player" variant="outline">
              <UserPlus />
            </ButtonWithTooltip>
          </DialogTrigger>
          <DialogContent>
            <PlayerUploadForm uploadCreature={onPlayerUpload} />
          </DialogContent>
        </Dialog>
      </span>
      <Separator />
      <CreateEncounterButton />
      <div className="flex flex-row gap-5">
        <EncounterSection
          name="Active"
          encounters={encountersByStatus.active ?? []}
        />
        <EncounterSection
          name="Inactive"
          encounters={encountersByStatus.inactive ?? []}
        />
      </div>
    </div>
  );
}

function EncounterSection(props: { name: string; encounters: Encounter[] }) {
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
          status: encounter.status === "active" ? "inactive" : "active",
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
        },
        "border-2 border-dashed border-transparent flex w-[348px] flex-col ",
      )}
    >
      <h1 className={"text-2xl"}>{props.name}</h1>
      <ul className="flex flex-col gap-5">
        {props.encounters?.length === 0 ? (
          <EncounterSkeleton unmoving>No encounters</EncounterSkeleton>
        ) : null}
        {props.encounters?.map((encounter) => (
          <DraggableEncounterCard
            encounter={encounter}
            deleteEncounter={deleteEncounter}
            key={encounter.id}
          />
        ))}
      </ul>
    </section>
  );
}

export function CreateEncounterButton({ className }: { className?: string }) {
  const { encounters } = api.useUtils();
  const campaignId = useCampaignId();

  const router = useRouter();
  const { mutate: createDefaultEncounter, isLoading: isCreatingEncounter } =
    api.createEncounter.useMutation({
      onSuccess: async (encounter) => {
        router.push(routeToEncounter(campaignId, encounter.id));
        return await encounters.invalidate();
      },
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createDefaultEncounter({
          name: null,
          description: null,
          campaign_id: campaignId,
        });
      }}
      className={className}
    >
      <LoadingButton
        isLoading={isCreatingEncounter}
        type={"submit"}
        className={"flex gap-5 w-52"}
      >
        <Plus />
        Create encounter
      </LoadingButton>
    </form>
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

function DraggableEncounterCard({
  encounter,
  deleteEncounter,
}: {
  encounter: Encounter;
  deleteEncounter: (id: string) => void;
}) {
  const campaignId = useCampaignId();
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
          status: droppedEncounter.status === "active" ? "inactive" : "active",
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
        },
        "transition-all border-b-2 border-t-2 border-t-transparent border-b-transparent -mb-[2px] last:mb-0 py-1",
      )}
    >
      <Card
        className={clsx("flex flex-col transition-all cursor-grab")}
        draggable
        onDragStart={(e) => {
          typedDrag.set(e.dataTransfer, dragTypes.encounter, encounter);
        }}
      >
        <Link
          draggable={false}
          href={
            encounter.started_at
              ? `${routeToEncounter(campaignId, encounter.id)}/run`
              : routeToEncounter(campaignId, encounter.id)
          }
          className="flex hover:bg-gray-200 p-5 justify-center border-b relative group bg-gray-100 rounded-t-lg"
        >
          <span
            className={
              "absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 text-white bg-black p-2 rounded-full transition-opacity"
            }
          >
            <ExternalLink />
          </span>

          <h2 className={"text-2xl pb-5"}>
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
