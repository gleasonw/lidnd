"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { use, useState } from "react";
import { Card } from "@/components/ui/card";
import { Edit } from "lucide-react";
import { api } from "@/trpc/react";
import type { Participant } from "@/server/api/router";
import { useCampaign } from "../campaign-hooks";
import { ParticipantUtils } from "@/utils/participants";
import {
  EncounterUtils,
  type EncounterWithParticipantDifficulty,
} from "@/utils/encounters";
import { useCampaignId } from "@/app/[username]/[campaign_slug]/campaign_id";
import { useUser } from "@/app/[username]/user-provider";
import { CreatureIcon } from "@/encounters/[encounter_index]/character-icon";
import { appRoutes } from "@/app/routes";
import { Badge } from "@/components/ui/badge";
import type { CampaignWithData } from "@/server/sdk/campaigns";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { LidndTextInput } from "@/components/ui/lidnd-text-input";
import { LidndTextArea } from "@/components/ui/lidnd-text-area";
import { Switch } from "@/components/ui/switch";
import { createEncounter } from "@/app/[username]/actions";
import { useEncounter } from "@/encounters/[encounter_index]/hooks";

export function CampaignParty({ campaign }: { campaign: CampaignWithData }) {
  const user = useUser();
  const partyLink = appRoutes.party({ campaign, user });

  return (
    <div className="flex gap-5">
      <div className="flex -space-x-2">
        {campaign.campaignToPlayers.map((p) => (
          <CreatureIcon key={p.id} creature={p.player} size="small" />
        ))}
        <Link href={partyLink}>
          <Button variant="ghost">
            <Edit />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function DifficultyBadge({
  encounter,
}: {
  encounter: EncounterWithParticipantDifficulty;
}) {
  const [campaign] = useCampaign();
  const diffColor = EncounterUtils.difficultyCssClasses(encounter, campaign);
  return (
    <Badge className={`${diffColor} flex-grow-0 h-8 text-sm rounded-sm`}>
      {EncounterUtils.difficulty(encounter, campaign?.party_level)}
    </Badge>
  );
}

export function CreateEncounterForm({
  gameSessionId,
}: {
  gameSessionId: string;
}) {
  const [campaign] = useCampaign();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    immediatelyRender: false,
  });

  const { encountersInCampaign, campaignById, campaignFromUrl } =
    api.useUtils();

  return (
    <Card className="px-3 pb-3">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await createEncounter({
            name,
            description,
            campaign_id: campaign.id,
            session_id: gameSessionId,
          });
          setName("");
          setDescription("");
          // sync with react query local state
          await Promise.all([
            encountersInCampaign.invalidate(),
            campaignById.invalidate(campaign.id),
            campaignFromUrl.invalidate(),
          ]);
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
            <Button type="submit">{"Create"}</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
