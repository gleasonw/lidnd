"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const damageTypes = [
  {
    value: "acid",
    label: "Acid",
  },
  {
    value: "bludgeoning",
    label: "Bludgeoning",
  },
  {
    value: "cold",
    label: "Cold",
  },
  {
    value: "fire",
    label: "Fire",
  },
  {
    value: "force",
    label: "Force",
  },
  {
    value: "lightning",
    label: "Lightning",
  },
  {
    value: "necrotic",
    label: "Necrotic",
  },
  {
    value: "piercing",
    label: "Piercing",
  },
  {
    value: "poison",
    label: "Poison",
  },
  {
    value: "psychic",
    label: "Psychic",
  },
  {
    value: "radiant",
    label: "Radiant",
  },
  {
    value: "slashing",
    label: "Slashing",
  },
  {
    value: "thunder",
    label: "Thunder",
  },
] as const;

export type DamageType = (typeof damageTypes)[number]["value"];

export interface ResistanceSelectorProps {
  className?: string;
  value: DamageType[];
  onChange: (value: DamageType[]) => void;
}

export function ResistanceSelector({
  className,
  value,
  onChange,
}: ResistanceSelectorProps) {
  const [open, setOpen] = React.useState(false);

  function handleChange(newValue: DamageType) {
    if (value.includes(newValue)) {
      onChange(value.filter((v) => v !== newValue));
    } else {
      onChange([...value, newValue]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={"opacity-50"}>Resistances and immunities...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command className="w-full">
          <CommandInput placeholder="Search damage..." />
          <CommandEmpty>No damage type found.</CommandEmpty>
          <CommandGroup>
            {damageTypes.map((damage) => (
              <CommandItem
                key={damage.value}
                onSelect={() => handleChange(damage.value)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(damage.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {damage.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
