import { LidndAuth, UserUtils } from "@/app/authentication";
import { EncounterStatus } from "@/server/api/db/schema";
import { ServerEncounter } from "@/server/encounters";
import { encounterFromPathParams } from "@/server/utils";

export async function updateStatusFromParams(
  params: unknown,
  status: EncounterStatus
) {
  const user = await LidndAuth.getUser();

  if (!user) {
    throw new Error("no user");
  }

  const context = UserUtils.context(user);

  const [_, encounter] = await encounterFromPathParams(context, params);

  ServerEncounter.updateStatus(context, encounter.id, status);
}
