"use client";

import { LidndAutocomplete } from "@/components/ui/lidnd-autocomplete";
import {
  useEncounter,
  useUserTags,
  useCreateTag,
  useAddTagToEncounter,
  useRemoveTagFromEncounter,
} from "@/encounters/[encounter_index]/hooks";
import type { AutocompleteOption } from "@/components/ui/lidnd-autocomplete";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { appRoutes } from "@/app/routes";
import { useCampaign } from "@/app/[username]/[campaign_slug]/campaign-hooks";
import { useUser } from "@/app/[username]/user-provider";

export function EncounterTagger() {
  const [encounter] = useEncounter();
  const [campaign] = useCampaign();
  const user = useUser();
  const { data: userTags = [] } = useUserTags();
  const createTag = useCreateTag();
  const addTag = useAddTagToEncounter();
  const removeTag = useRemoveTagFromEncounter();

  // Convert user tags to autocomplete options
  const tagOptions: AutocompleteOption[] = userTags.map((tag) => ({
    value: tag.name,
    label: tag.name,
  }));

  const handleCreate = async (tagName: string) => {
    const newTag = await createTag.mutateAsync({ name: tagName });

    // Automatically add the newly created tag to the encounter
    if (newTag) {
      addTag.mutate({
        encounter_id: encounter.id,
        tag_id: newTag.id,
      });
    }
  };

  const handleSubmit = (tagLabel: string) => {
    const tagExists = userTags.find(
      (tag) => tag.name.toLowerCase() === tagLabel.toLowerCase()
    );
    if (tagExists) {
      removeTag.mutate({
        encounter_id: encounter.id,
        tag_id: tagExists.id,
      });
      return;
    }

    const input = tagLabel.trim();
    if (input.length === 0) {
      return;
    } else {
      handleCreate(input).catch((err) => {
        console.error("Error creating tag:", err);
      });
    }
  };

  const handleAssignExisting = (option: AutocompleteOption) => {
    const tagFor = userTags.find((tag) => tag.name === option.label);
    if (tagFor) {
      if (encounter.tags.find((t) => t.tag.id === tagFor.id)) {
        removeTag.mutate({
          encounter_id: encounter.id,
          tag_id: tagFor.id,
        });
      } else {
        addTag.mutate({
          encounter_id: encounter.id,
          tag_id: tagFor.id,
        });
      }
    }
  };

  return (
    <div className="flex gap-2">
      <LidndAutocomplete
        options={tagOptions}
        onSelect={(opt) => handleAssignExisting(opt)}
        onEnterNew={(value) => handleSubmit(value)}
        trigger={
          <Badge variant="outline" className="cursor-pointer">
            <PlusIcon className="h-4 w-4" /> Tags
          </Badge>
        }
      />

      <div className="flex gap-2">
        {encounter.tags.map((tag) => (
          <Badge
            variant="outline"
            className="text-blue-700 border-blue-700 flex"
            key={tag.id}
          >
            <Link
              href={appRoutes.campaign({
                campaign,
                user,
                encounterSearchFilters: { tagId: tag.tag_id },
              })}
              className="w-fit flex"
            >
              <span className="p-1">{tag.tag.name}</span>
            </Link>

            <Button variant="ghost" className="w-3 h-3 p-2">
              <XIcon className="w-4 h-4" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
