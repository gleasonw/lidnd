import { db } from "@/server/api/db";
import { campaigns, creatures, encounters } from "@/server/api/db/schema";
import { eq, isNull } from "drizzle-orm";
import _ from "lodash";

async function setPlayerHpTo1() {
  await db
    .update(creatures)
    .set({ max_hp: 1 })
    .where(eq(creatures.is_player, true));
  return process.exit(0);
}

//@ts-ignore
async function updateStatus() {
  await db
    .update(encounters)
    .set({ status: "prep" })
    .where(isNull(encounters.started_at));
  return process.exit(0);
}

//@ts-ignore
async function update_encounter_index() {
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

//@ts-ignore
async function add_campaign_slug() {
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

setPlayerHpTo1();
