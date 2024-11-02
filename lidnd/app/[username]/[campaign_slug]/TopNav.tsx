"use client";

import { useCampaign } from "@/app/[username]/[campaign_slug]/hooks";
import { useUser } from "@/app/[username]/user-provider";
import { appRoutes } from "@/app/routes";
import { Button } from "@/components/ui/button";
import _ from "lodash";
import {
  Home,
  Settings,
  Share,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import * as R from "remeda";

export function TopNav() {
  const [campaign] = useCampaign();
  const user = useUser();
  return (
    <div className="w-full bg-white text-gray-900 shadow-sm">
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200 h-16">
        <div className="flex items-center space-x-4 w-full">
          <Link
            href={appRoutes.dashboard(user)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Home className="h-5 w-5" />
          </Link>
          <div className="flex items-center w-full gap-3">
            <Link
              href={appRoutes.campaign(campaign, user)}
              className="flex whitespace-nowrap items-center text-sm text-gray-600 hover:text-gray-800 transition-colors px-2"
            >
              {campaign.name}
            </Link>
            <EncounterTopNav />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EncounterTopNav() {
  const pathname = usePathname();
  const user = useUser();
  const [campaign] = useCampaign();
  const encounterIndex = pathname.split("/").at(4);
  const encounter = campaign.encounters.find(
    (e) => e.index_in_campaign === parseInt(encounterIndex ?? ""),
  );

  if (!encounter) {
    return null;
  }

  const indexForDisplay = R.sort(
    campaign?.encounters,
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
    <div className="flex items-center gap-10 w-full">
      <ChevronRight className="h-4 w-4 text-gray-400" />
      <div className="flex items-center gap-5 w-full">
        <span className="text-lg font-medium text-gray-900">
          {encounter.name}
        </span>{" "}
        <div className="flex items-center opacity-50 gap-2">
          <span>
            {indexForDisplay + 1} / {campaign.encounters.length}
          </span>
          <span>
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
              <Button variant="ghost" disabled className="h-6 w-6 p-0">
                <ChevronDown />
              </Button>
            )}
          </span>
        </div>
        <span className="text-2xl font-bold ml-auto">
          Round {encounter.current_round}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          <Share className="h-5 w-5" />
        </button>
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
