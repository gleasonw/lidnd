"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface LidndAutocompleteProps {
  /** Available options to select from */
  options: AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  onEnterNew?: (inputValue: string) => void;
}

export function LidndAutocomplete({
  options,
  onSelect,
  onEnterNew,
}: LidndAutocompleteProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[150px] justify-between"
        >
          Select
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search... (enter to create)"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // @ts-expect-error thing
                const value = e.target.value;
                if (!options.some((opt) => opt.value === value)) {
                  onEnterNew?.(value);
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    setOpen(false);
                    onSelect?.(option);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
