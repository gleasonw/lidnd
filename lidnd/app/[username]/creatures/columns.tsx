import { CharacterIcon } from "@/app/[username]/[campaign_slug]/encounter/[encounter_index]/character-icon";
import { Creature } from "@/server/api/router";
import { ColumnDef } from "@tanstack/react-table";

function valueIsCreature(value: any): value is Creature {
  if (!value) {
    return false;
  }
  return "id" in value && "name" in value;
}

export const columns: ColumnDef<Creature>[] = [
  {
    accessorFn: (data) => ({ id: data.id, name: data.name }),
    header: "Icon",
    cell: (row) => {
      const data = row.getValue();
      if (valueIsCreature(data)) {
        return <CharacterIcon id={data.id} name={data.name} />;
      }
      return <div>No icon</div>;
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "challenge_rating",
    header: "CR",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "max_hp",
    header: "HP",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "is_player",
    header: "Player",
    cell: (info) => info.getValue(),
  },
];
