import { db } from "@/server/db";
import {
  campaigns,
  creatures,
  encounters,
  participants,
  stat_columns,
  type StatColumnInsert,
} from "@/server/db/schema";
import { eq, isNull, sql } from "drizzle-orm";
import _ from "lodash";
import * as R from "remeda";
import type { Participant } from "@/server/api/router";
import type { StatColumn } from "@/server/api/columns-router";
import { StatColumnUtils } from "@/utils/stat-columns";

//@ts-expect-error - unused unused
async function setPlayerHpTo1() {
  const results = await db
    .update(participants)
    .set({ hp: 1 })
    .where(eq(creatures.type, "player"))
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

//@ts-expect-error - unused unused
async function assign_columns() {
  const encounters = await db.query.encounters.findMany({
    with: {
      columns: true,
      participants: true,
    },
  });

  for (const encounter of encounters) {
    const numColumns = encounter.columns.length;
    if (numColumns === 0) {
      const result = await db
        .insert(stat_columns)
        .values({
          encounter_id: encounter.id,
          percent_width: 100,
        })
        .returning();
      if (result[0] === undefined) {
        throw new Error(
          `failed to create initial column for encounter with no columns`
        );
      }
      await assign_participants_to_column(encounter.participants, result[0]);
    } else {
      // need to assign participants to columns
      const chunkedParticipants = R.chunk(encounter.participants, numColumns);
      await Promise.all(
        chunkedParticipants.map((c, i) => {
          const matchingColumn = encounter.columns[i];
          if (!matchingColumn) {
            throw new Error(`failed to find column based on participant chunk`);
          }
          return assign_participants_to_column(c, matchingColumn);
        })
      );
    }
  }
  return process.exit(0);
}

async function assign_participants_to_column(
  pBatch: Participant[],
  column: StatColumn
) {
  await db
    .insert(participants)
    .values(pBatch)
    .onConflictDoUpdate({
      target: participants.id,
      set: {
        column_id: column.id,
      },
    });
}

async function add_home_columns() {
  const encounters = await db.query.encounters.findMany({
    with: {
      columns: true,
    },
  });
  const columnsToPush: StatColumnInsert[] = [];
  encounters.forEach(async (encounter) => {
    if (encounter.columns.find((c) => c.is_home_column)) {
      return;
    }
    const updatedColumns = StatColumnUtils.add(encounter.columns, {
      encounter_id: encounter.id,
      is_home_column: true,
      percent_width: 0,
    });
    columnsToPush.push(...updatedColumns);
  });
  await db
    .insert(stat_columns)
    .values(columnsToPush)
    .onConflictDoUpdate({
      target: stat_columns.id,
      set: {
        percent_width: sql.raw(`excluded.percent_width`),
      },
    });
  return process.exit(0);
}

add_home_columns();
