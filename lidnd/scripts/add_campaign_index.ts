import { db } from "@/server/api/db";
import { campaigns, encounters } from "@/server/api/db/schema";
import { eq } from "drizzle-orm";
import _ from "lodash";

async function main() {
  const campaigns = await db.query.campaigns.findMany();

  for (const campaign of campaigns) {
    console.log(`Adding indices to ${campaign.name}`);
    const campaignEncounters = await db.query.encounters.findMany({
      where: (encounters, { eq }) => eq(encounters.campaign_id, campaign.id),
      orderBy: (encounters, { asc }) => asc(encounters.created_at),
    });

    let index = 0;

    for (const encounter of campaignEncounters) {
      console.log("Updating ", encounter.name);
      await db
        .update(encounters)
        .set({
          index_in_campaign: index + 1,
        })
        .where(eq(encounters.id, encounter.id));
      index++;
    }
  }

  return process.exit(0);
}

async function addCampaignSlug() {
  const c = await db.query.campaigns.findMany();

  for (const campaign of c) {
    console.log(`Adding slug to ${campaign.name}`);
    await db
      .update(campaigns)
      .set({
        slug: _.kebabCase(campaign.name),
      })
      .where(eq(campaigns.id, campaign.id));
  }

  return process.exit(0);
}

addCampaignSlug();
