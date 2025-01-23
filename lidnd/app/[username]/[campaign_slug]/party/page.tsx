"use client";

import {
  useAddExistingToParty,
  useAddNewToParty,
  useCampaign,
  useRemoveFromParty,
  useUpdateCampaign,
} from "@/app/[username]/[campaign_slug]/campaign-hooks";
import {
  AllyCreatureUploadForm,
  PlayerCreatureUploadForm,
  useCreatureForm,
  usePlayerCreatureForm,
  type CreatureUpload,
  type PlayerUpload,
} from "@/app/[username]/[campaign_slug]/CreatureUploadForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { AddCreatureButton } from "@/encounters/add-creature-button";
import { api } from "@/trpc/react";
import { Plus, Smile, User, UserPlus } from "lucide-react";
import React from "react";
import { useState } from "react";
import * as R from "remeda";
import { useDebouncedCallback } from "use-debounce";

export default function PartyPage() {
  const [campaign] = useCampaign();
  const { mutate: removeFromParty } = useRemoveFromParty(campaign);

  return (
    <div className="flex flex-col gap-5 pt-5">
      {/* todo: make a table */}
      <PartyLevelInput />
      <Card className="flex w-full flex-col gap-5 p-3">
        {campaign.campaignToPlayers.map((c) => (
          <div key={c.id} className="flex gap-2 items-center border">
            <CreatureIcon key={c.player.id} creature={c.player} />
            <span>{c.player.name}</span>
            <Button
              variant="destructive"
              className="ml-auto"
              onClick={() => removeFromParty(c.player.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </Card>
      <Card className="p-5">
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
                <AddNpcToPartyForm />
              </TabsContent>
              <TabsContent value="player">
                <AddPlayerToPartyForm />
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="existing">
            <ExistingCreaturesForPartyAdd campaignId={campaign.id} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function PartyLevelInput() {
  const [campaign] = useCampaign();
  const { mutate: updateCampaign } = useUpdateCampaign(campaign);

  const [partyLevel, setPartyLevel] = React.useState(
    campaign?.party_level ?? 1
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
  );
}

function AddNpcToPartyForm() {
  const allyForm = useCreatureForm();
  const [campaign] = useCampaign();

  function onSubmitAlly(data: CreatureUpload) {
    const creatureValue = R.omit(data, ["iconImage", "statBlockImage"]);
    onPlayerUpload({
      campaign_id: campaign.id,
      creature: { ...creatureValue, is_player: false },
      hasIcon: data.iconImage !== undefined,
      hasStatBlock: data.statBlockImage !== undefined,
    });
  }

  const { mutate: onPlayerUpload, isPending } = useAddNewToParty({
    campaign,
    statBlockImage: allyForm.getValues("statBlockImage"),
    iconImage: allyForm.getValues("iconImage"),
  });

  return (
    <AllyCreatureUploadForm
      form={allyForm}
      onSubmit={onSubmitAlly}
      isPending={isPending}
    />
  );
}

function AddPlayerToPartyForm() {
  const [campaign] = useCampaign();
  const playerForm = usePlayerCreatureForm();

  function onSubmitPlayer(data: PlayerUpload) {
    const creatureValue = R.omit(data, ["iconImage"]);
    onPlayerUpload({
      campaign_id: campaign.id,
      creature: {
        ...creatureValue,
        is_player: true,
        max_hp: 1,
        challenge_rating: 0,
      },
      hasIcon: data.iconImage !== undefined,
      hasStatBlock: false,
    });
  }

  const { mutate: onPlayerUpload, isPending } = useAddNewToParty({
    campaign,
    iconImage: playerForm.getValues("iconImage"),
  });

  return (
    <PlayerCreatureUploadForm
      form={playerForm}
      onSubmit={onSubmitPlayer}
      isPending={isPending}
    />
  );
}

export function ExistingCreaturesForPartyAdd({
  campaignId,
}: {
  campaignId: string;
}) {
  const [name, setName] = useState("");
  const { data: creatures } = api.getUserCreatures.useQuery({
    name,
  });
  const { mutate: addCreature } = useAddExistingToParty({ id: campaignId });
  const creaturesPlayersFirst = R.sort(creatures ?? [], (a, b) =>
    a.is_player ? -1 : b.is_player ? 1 : 0
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
          <AddCreatureButton
            creature={creature}
            key={creature.id}
            onClick={() => addCreature({ creature, campaign_id: campaignId })}
          />
        ))}
      </div>
    </div>
  );
}
