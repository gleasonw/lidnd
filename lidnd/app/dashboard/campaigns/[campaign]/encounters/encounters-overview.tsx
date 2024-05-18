"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { CharacterIcon } from "../encounters/[id]/character-icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, MoreHorizontal, Plus, UserPlus } from "lucide-react";
import { EncounterTime } from "../encounters/[id]/run/encounter-time";
import { api } from "@/trpc/react";
import { Encounter } from "@/server/api/router";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCampaignId } from "../hooks";
import { routeToEncounter } from "@/app/routes";
import { VerifySlider } from "@/encounters/verify-slider";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { PlayerUploadForm } from "@/encounters/full-creature-add-form";
import { CreaturePost } from "@/encounters/types";
import { getCreaturePostForm } from "@/encounters/utils";
import { createPlayerAndAddToCampaign } from "@/app/dashboard/actions";
import { Separator } from "@/components/ui/separator";

export interface CampaignEncountersProps {
  deleteCampaignButton: React.ReactNode;
  playersDisplay: React.ReactNode;
  campaignHeader: React.ReactNode;
}

export default function CampaignEncountersOverview(
  props: CampaignEncountersProps,
) {
  const { deleteCampaignButton, playersDisplay, campaignHeader } = props;
  const campaignId = useCampaignId();
  const { data: encounters, isLoading } = api.encounters.useQuery(campaignId);
  const displayedEncounters = encounters;

  const startedEncounters = displayedEncounters?.filter(
    (encounter) => encounter.started_at !== null,
  );

  const pendingEncounters = displayedEncounters?.filter(
    (encounter) => encounter.started_at === null,
  );

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
      <EncounterSection name="Started" encounters={startedEncounters} />
      <EncounterSection name="Pending" encounters={pendingEncounters} />
      <VerifySlider
        initial={
          <Button variant="destructive" size="sm" className="w-40">
            Delete campaign
          </Button>
        }
        verified={deleteCampaignButton}
      />
    </div>
  );
}

function EncounterSection(props: { name: string; encounters?: Encounter[] }) {
  const campaignId = useCampaignId();
  const { encounters: encountersQuery } = api.useUtils();
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

  return (
    <section key={props.name} className={"flex flex-col gap-8 pt-8"}>
      <h1 className={"text-2xl"}>{props.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {props.encounters?.length === 0 ? (
          <EncounterSkeleton unmoving>No encounters</EncounterSkeleton>
        ) : null}
        {props.encounters?.map((encounter) => (
          <EncounterCard
            encounter={encounter}
            deleteEncounter={deleteEncounter}
            key={encounter.id}
          />
        ))}
      </div>
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

function EncounterCard({
  encounter,
  deleteEncounter,
}: {
  encounter: Encounter;
  deleteEncounter: (id: string) => void;
}) {
  const campaignId = useCampaignId();
  return (
    <Card className="flex flex-col transition-all w-full" key={encounter.id}>
      <Link
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
        <EncounterTime time={encounter?.started_at ?? undefined} />
      </div>
    </Card>
  );
}

function MonstersInEncounter({ id }: { id: string }) {
  const campaignId = useCampaignId();
  const { data: encounters } = api.encounters.useQuery(campaignId);

  const creatures = encounters
    ?.find((encounter) => encounter.id === id)
    ?.participants.filter((creature) => !creature.is_player);

  return (
    <div className={"flex gap-3 flex-wrap"}>
      {creatures?.map((creature) => (
        <CharacterIcon
          id={creature.creature_id}
          name={creature.name}
          key={creature.creature_id}
          className={"rounded-full object-cover w-10 h-10"}
          width={100}
          height={100}
        />
      ))}
    </div>
  );
}
