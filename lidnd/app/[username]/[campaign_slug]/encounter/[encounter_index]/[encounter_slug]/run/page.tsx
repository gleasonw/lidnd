import { BattleUILoader } from "@/encounters/[encounter_index]/battle-ui";

export default async function RunPage({ params }: { params: unknown }) {
  return <BattleUILoader />;
}
