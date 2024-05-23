import { BattleUI } from "@/encounters/[id]/run/battle-ui";
import { getPageSession } from "@/server/api/utils";

export default async function BattlePage(params: { params: { id: string } }) {
  const session = await getPageSession();

  if (!session) {
    console.log("user not logged in");
    return <div>No session found.</div>;
  }

  return <BattleUI />;
}
