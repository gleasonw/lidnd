import { db } from "@/server/api/db";
import {
  campaigns,
  creatures,
  encounters,
  participants,
} from "@/server/api/db/schema";
import { CreatureUtils } from "@/utils/creatures";
import { eq, isNull } from "drizzle-orm";
import _ from "lodash";
import sharp from "sharp";

addImageDimensions();

async function addImageDimensions() {
  const allCreatures = await db.query.creatures.findMany();

  for (const creature of allCreatures) {
    console.log(`Adding dimensions to ${creature.name}`);
    const iconUrl = CreatureUtils.awsURL(creature, "icon");
    const iconResponse = await fetch(iconUrl);

    if (!iconResponse.ok) {
      console.log(iconUrl);
      console.error("Failed to fetch icon");
      continue;
    }

    const statBlockResponse = await fetch(
      CreatureUtils.awsURL(creature, "stat_block")
    );

    if (!statBlockResponse.ok) {
      console.error("Failed to fetch stat block");
      continue;
    }

    const [iconBuffer, statBlockBuffer] = await Promise.all([
      iconResponse.arrayBuffer(),
      statBlockResponse.arrayBuffer(),
    ]);

    const [iconDimensions, statBlockDimensions] = await Promise.all([
      sharp(iconBuffer).metadata(),
      sharp(statBlockBuffer).metadata(),
    ]);

    console.log(
      `fetched dimensions for ${creature.name}: ${iconDimensions.height}x${iconDimensions.width}, ${statBlockDimensions.height}x${statBlockDimensions.width}`
    );

    await db
      .update(creatures)
      .set({
        icon_height: iconDimensions.height,
        icon_width: iconDimensions.width,
        stat_block_height: statBlockDimensions.height,
        stat_block_width: statBlockDimensions.width,
      })
      .where(eq(creatures.id, creature.id));

    console.log(`updated dimensions for ${creature.name}`);
  }

  return process.exit(0);
}

//@ts-expect-error - unused unused
async function setPlayerHpTo1() {
  const results = await db
    .update(participants)
    .set({ hp: 1 })
    .where(eq(creatures.is_player, true))
    .returning();
  console.log(results);
  return process.exit(0);
}

//@ts-expect-error - unused unused
async function updateStatus() {
  await db
    .update(encounters)
    .set({ status: "prep" })
    .where(isNull(encounters.started_at));
  return process.exit(0);
}

//@ts-expect-error - unused unused
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

//@ts-expect-error - unused unused
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
