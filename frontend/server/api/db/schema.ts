import {
  bigint,
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const encounters = pgTable(
  "encounters-drizzle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }),
    description: varchar("description", { length: 256 }),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    user_id: bigint("user_id", { mode: "number" }).notNull(),
  },
  (t) => {
    return {
      userIndex: index("user_index").on(t.user_id),
    };
  }
);

export const creatures = pgTable(
  "creatures-drizzle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    created_at: timestamp("created_at").defaultNow(),
    max_hp: integer("max_hp"),
    challenge_rating: decimal("challenge_rating"),
    is_player: boolean("is_player"),
    user_id: bigint("user_id", { mode: "number" }).notNull(),
  },
  (t) => {
    return {
      userIndex: index("user_index").on(t.user_id),
    };
  }
);

export const encounter_participant = pgTable(
  "encounter_participant-drizzle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_id: uuid("encounter_id")
      .references(() => encounters.id)
      .notNull(),
    creature_id: uuid("creature_id")
      .references(() => creatures.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow(),
    initiative: integer("initiative").default(0).notNull(),
    hp: integer("hp").default(0).notNull(),
    is_active: boolean("is_active").default(false),
  },
  (table) => {
    return {
      encounterIndex: index("encounter_index").on(table.encounter_id),
      creatureIndex: index("creature_index").on(table.creature_id),
    };
  }
);

export const settings = pgTable("settings-drizzle", {
  user_id: uuid("user_id").primaryKey(),
  show_health_in_discord: boolean("show_health_in_discord").default(false),
  show_icons_in_discord: boolean("show_icons_in_discord").default(true),
  average_turn_seconds: integer("average_turn_seconds").default(180),
  default_player_level: integer("default_player_level").default(1),
});
