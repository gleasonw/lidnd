"use client";

import { CampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import {
  useMaybeCampaignSlug,
  useMaybeEncounterIndex,
} from "@/app/[username]/hooks";
import { useUser } from "@/app/[username]/user-provider";
import type { LidndUser } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LidndDialog } from "@/components/ui/lidnd_dialog";
import { ButtonWithTooltip } from "@/components/ui/tip";
import { ToggleEditingMode } from "@/encounters/[encounter_index]/battle-bar";
import { EncounterId } from "@/encounters/[encounter_index]/encounter-id";
import { GroupInitiativeInput } from "@/encounters/[encounter_index]/group-initiative-input";
import {
  useEncounter,
  useUpdateEncounter,
} from "@/encounters/[encounter_index]/hooks";
import { CampaignParty } from "@/encounters/campaign-encounters-overview";
import { api } from "@/trpc/react";
import _ from "lodash";
import {
  Home,
  Share,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  Play,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import * as R from "remeda";

export function TopNav({
  createCampaignButton,
}: {
  createCampaignButton: React.ReactNode;
}) {
  const user = useUser();
  return (
    <div className="p-4 flex flex-shrink-0 flex-grow-0 items-center gap-5 border-b border-gray-200 h-16 overflow-hidden bg-white">
      <Link
        href={appRoutes.dashboard(user)}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="h-6 w-6" />
      </Link>
      <CampaignGate createCampaignButton={createCampaignButton}>
        <CampaignTopNav user={user} />
      </CampaignGate>
      <Link
        href={appRoutes.settings(user)}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <DiscordAvatar user={user} />
      </Link>
    </div>
  );
}

// todo: i should really move these pathname splits into a "check location" hook or something
function CampaignGate({
  children,
  createCampaignButton,
}: {
  children: React.ReactNode;
  createCampaignButton: React.ReactNode;
}) {
  const campaignSlug = useMaybeCampaignSlug();
  if (!campaignSlug) {
    // we must be on the main campaigns page... a little clunky
    return (
      <div className="flex items-center mr-auto gap-10">
        <span className="text-xl whitespace-nowrap font-medium">
          My campaigns
        </span>
        {createCampaignButton}
      </div>
    );
  }
  return children;
}

function CampaignTopNav({ user }: { user: LidndUser }) {
  const campaignSlug = useMaybeCampaignSlug();
  const encounterIndex = useMaybeEncounterIndex();
  const isOnEncounterRoute = encounterIndex !== null;
  const { data: campaign } = api.campaignFromUrl.useQuery(
    {
      campaign_name: campaignSlug ?? "",
    },
    { enabled: campaignSlug !== undefined },
  );
  if (!campaign) {
    return null;
  }
  return (
    <CampaignId value={campaign.id}>
      <div
        className={`flex items-center gap-5 ${isOnEncounterRoute ? "" : ""}`}
      >
        <Link
          href={appRoutes.campaign(campaign, user)}
          className="flex whitespace-nowrap items-center text-lg text-gray-600 hover:text-gray-800 transition-colors"
        >
          {campaign.name}
        </Link>
        {/* this is a little cludgy. I'd like to know if there's a better way to hoist things into the top nav*/}
        {isOnEncounterRoute ? null : <CampaignParty campaign={campaign} />}
      </div>

      <EncounterTopNav />
    </CampaignId>
  );
}

const DiscordAvatar = ({
  user,
  size = 32,
}: {
  user: LidndUser;
  size?: number;
}) => {
  const [imageError, setImageError] = useState(false);

  // Discord CDN base URL
  const DISCORD_CDN = "https://cdn.discordapp.com";

  let avatarSrc = "";
  console.log(user);
  if (user.discord_id) {
    avatarSrc = `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?${size}`;
  } else {
    const defaultAvatarIndex = (BigInt(user.discord_id) >> 22n) % 6n;
    avatarSrc = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }
  // Handle image load errors
  const handleError = () => {
    setImageError(true);
  };

  return (
    <div className="relative">
      <img
        src={imageError ? `${DISCORD_CDN}/embed/avatars/0.png` : avatarSrc}
        alt="Discord Avatar"
        onError={handleError}
        className="rounded-full"
        width={size}
        height={size}
      />
    </div>
  );
};
export function EncounterTopNav() {
  const pathname = usePathname();
  const user = useUser();

  const campaignSlug = useMaybeCampaignSlug();
  const { data: campaign } = api.campaignFromUrl.useQuery(
    {
      campaign_name: campaignSlug ?? "",
    },
    { enabled: campaignSlug !== undefined },
  );
  if (!campaign) {
    return null;
  }
  const encounterIndex = pathname.split("/").at(4);
  const encounter = campaign?.encounters.find(
    (e) => e.index_in_campaign === parseInt(encounterIndex ?? ""),
  );

  if (!encounter) {
    return null;
  }

  const indexForDisplay = R.sort(
    campaign.encounters,
    (a, b) => a.index_in_campaign - b.index_in_campaign,
  ).findIndex((e) => e.id === encounter?.id);

  const currentIndex = encounter.index_in_campaign;

  const priorEncounter = _.maxBy(
    campaign.encounters.filter((e) => e.index_in_campaign < currentIndex),
    (e) => e.index_in_campaign,
  );

  const nextEncounter = _.minBy(
    campaign.encounters.filter((e) => e.index_in_campaign > currentIndex),
    (e) => e.index_in_campaign,
  );

  return (
    <EncounterId encounterIndex={encounter.index_in_campaign}>
      <div className="flex items-center gap-2">
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-lg w-44 max-w-full truncate font-medium text-gray-900">
          {encounter.name}
        </span>
        <span className="whitespace-nowrap">
          {indexForDisplay + 1} / {campaign.encounters.length}
        </span>
        <span className="flex items-center gap-2">
          {priorEncounter ? (
            <Link href={appRoutes.encounter(campaign, priorEncounter, user)}>
              <Button variant="ghost" className="p-0 h-6 w-6" size="icon">
                <ChevronUp />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" disabled className="h-6 w-6 p-0">
              <ChevronUp />
            </Button>
          )}
          {nextEncounter ? (
            <Link href={appRoutes.encounter(campaign, nextEncounter, user)}>
              <Button variant="ghost" className="p-0 h-6 w-6" size="icon">
                <ChevronDown />
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              disabled
              size="icon"
              className="h-6 w-6 p-0"
            >
              <ChevronDown />
            </Button>
          )}
        </span>
      </div>
      <EncounterWidgets />
    </EncounterId>
  );
}

function EncounterWidgets() {
  const [encounter] = useEncounter();
  const { mutate: updateEncounter } = useUpdateEncounter();

  return (
    <div className="flex items-center gap-2 ml-auto">
      {encounter.status !== "run" ? (
        <div className="flex items-center gap-2">
          <LidndDialog
            title={"Roll initiative"}
            trigger={
              <Button
                className=" text-lg h-full w-full ml-auto max-w-sm flex gap-3"
                onClick={() =>
                  updateEncounter({ ...encounter, is_editing_columns: false })
                }
              >
                Roll initiative
                <Play />
              </Button>
            }
            content={<GroupInitiativeInput />}
          />
        </div>
      ) : (
        <EncounterRoundNumber encounterId={encounter.id} />
      )}
      <ToggleEditingMode />
      <CheckmarkClicker
        onClick={() => {
          navigator.clipboard.writeText(
            `${window.location.origin}${appRoutes.observe(encounter.id)}`,
          );
        }}
        className="flex gap-2 items-center"
        variant="ghost"
        text={"Get sharable link"}
      >
        <Share />
      </CheckmarkClicker>
    </div>
  );
}

function EncounterRoundNumber({ encounterId }: { encounterId: string }) {
  const { data: liveEncounter } = api.encounterById.useQuery(encounterId);
  if (liveEncounter?.status !== "run") {
    // this just makes the layout work (left, right split)
    return <div className="mx-auto"></div>;
  }
  return (
    <span className=" font-bold ml-auto p-3 border shadow-md text-xl rounded-sm flex items-center gap-2">
      <Clock />
      <span>Round {liveEncounter?.current_round}</span>
    </span>
  );
}

function CheckmarkClicker({
  children,
  onClick,
  ...props
}: ButtonProps & { text: string }) {
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  return (
    <ButtonWithTooltip
      {...props}
      onClick={(e) => {
        setIsLinkCopied(true);
        onClick?.(e);
        setTimeout(() => {
          setIsLinkCopied(false);
        }, 2000);
      }}
    >
      {isLinkCopied ? <Check /> : children}
    </ButtonWithTooltip>
  );
}
