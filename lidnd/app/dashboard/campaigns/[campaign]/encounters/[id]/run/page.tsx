import { LidndAuth } from "@/app/authentication";
import { BattleUILoader } from "@/encounters/[id]/run/battle-ui";

export default async function BattlePage() {
  await LidndAuth.verifyLogin();
  return <BattleUILoader />;
}
