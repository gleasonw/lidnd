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

interface EncounterTaggerProps {
  className?: string;
}

export function EncounterTagger({ className }: EncounterTaggerProps) {
  const [encounter] = useEncounter();
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
      handleCreate(input);
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
      />

      <div className="flex gap-2">
        {encounter.tags.map((tag) => (
          <Badge
            variant="outline"
            className="text-blue-700 border-blue-700"
            key={tag.id}
          >
            {tag.tag.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
