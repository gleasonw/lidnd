import Link from "next/link";
import { redirect } from "next/navigation";
import { LidndAuth } from "@/app/authentication";
import { appRoutes } from "@/app/routes";
import { db } from "@/server/db";
import { campaigns, encounters } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export default async function ArchivedEncountersPage(props: {
  params: Promise<{ username: string; campaign_slug: string }>;
}) {
  const params = await props.params;
  const user = await LidndAuth.getUser();

  if (!user || user.username !== params.username) {
    return redirect("/login");
  }

  const campaign = await db.query.campaigns.findFirst({
    where: and(
      eq(campaigns.slug, params.campaign_slug),
      eq(campaigns.user_id, user.id)
    ),
  });

  if (!campaign) {
    return <div>No campaign found.</div>;
  }

  const archivedEncounters = await db.query.encounters.findMany({
    where: and(
      eq(encounters.campaign_id, campaign.id),
      eq(encounters.user_id, user.id),
      eq(encounters.is_archived, true)
    ),
    with: {
      session: true,
    },
    orderBy: (encounter, { desc }) => desc(encounter.created_at),
  });

  async function deleteArchivedEncounter(formData: FormData) {
    "use server";
    const user = await LidndAuth.getUser();
    if (!user) {
      throw new Error("No user found");
    }

    const encounterId = formData.get("encounter_id");
    if (typeof encounterId !== "string" || encounterId.length === 0) {
      throw new Error("Encounter id is required");
    }

    await db
      .delete(encounters)
      .where(
        and(
          eq(encounters.id, encounterId),
          eq(encounters.user_id, user.id),
          eq(encounters.is_archived, true)
        )
      );

    const campaignRoute = appRoutes.campaign({ campaign, user });
    revalidatePath(campaignRoute);
    revalidatePath(
      appRoutes.archivedEncountersForCampaign({ campaign, user })
    );
  }

  const campaignRoute = appRoutes.campaign({ campaign, user });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href={campaignRoute}>
          <Button variant="ghost">Back to campaign</Button>
        </Link>
        <h1 className="text-xl font-semibold">Archived encounters</h1>
      </div>

      {archivedEncounters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No archived encounters yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {archivedEncounters.map((encounter) => (
            <li
              key={encounter.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {encounter.name || "Unnamed encounter"}
                </p>
                {encounter.session?.name ? (
                  <p className="text-xs text-muted-foreground">
                    Session: {encounter.session.name}
                  </p>
                ) : null}
              </div>
              <form action={deleteArchivedEncounter}>
                <input
                  type="hidden"
                  name="encounter_id"
                  value={encounter.id}
                />
                <Button variant="destructive" size="sm">
                  Delete permanently
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
