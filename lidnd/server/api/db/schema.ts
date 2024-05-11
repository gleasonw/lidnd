import { InferInsertModel } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

export type DbSpell = InferInsertModel<typeof spells>;

export const spells = pgTable("spells", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  source: varchar("source", { length: 256 }).notNull(),
  page: integer("page").notNull(),
  srd: boolean("srd"),
  basicRules: boolean("basicRules"),
  level: integer("level").notNull(),
  school: varchar("school", { length: 256 }).notNull(),
  time: text("time").notNull(),
  range: text("range"),
  components: text("components").notNull(),
  duration: text("duration").notNull(),
  entries: text("entries").notNull(),
  scalingLevelDice: text("scalingLevelDice"),
  damageInflict: text("damageInflict"),
  savingThrow: text("savingThrow"),
  miscTags: text("miscTags"),
  areaTags: text("areaTags"),
});

export const initiative_enum = pgEnum("initiative_type", ["linear", "group"]);

export const systems = pgTable("systems", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  initiative_type: initiative_enum("initiative_type").default("linear"),
});

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    system_id: uuid("system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      userIndex: index("user_index_campaigns").on(t.user_id),
    };
  }
);

export const campaignsToPlayers = pgTable(
  "campaigns_to_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaign_id: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    player_id: uuid("player_id")
      .notNull()
      .references(() => creatures.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      campaignIndex: index("campaign_index").on(t.campaign_id),
      playerIndex: index("player_index").on(t.player_id),
    };
  }
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    description: text("description"),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    campaign_id: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    current_round: integer("current_round").default(1).notNull(),
    ended_at: timestamp("ended_at"),
  },
  (t) => {
    return {
      userIndex: index("user_index").on(t.user_id),
    };
  }
);

export const creatures = pgTable(
  "creatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    max_hp: integer("max_hp").notNull(),
    challenge_rating: real("challenge_rating").default(0).notNull(),
    is_player: boolean("is_player").default(false).notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      userIndex: index("user_index_creatures").on(t.user_id),
    };
  }
);

export const status_effects_5e = pgTable("status_effects_5e", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description").notNull(),
});

export const participant_status_effects = pgTable(
  "participant_status_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_participant_id: uuid("encounter_participant_id")
      .references(() => encounter_participant.id, { onDelete: "cascade" })
      .notNull(),
    status_effect_id: uuid("status_effect_id")
      .references(() => status_effects_5e.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    duration: integer("duration"),
    save_ends_dc: integer("save_ends_dc").default(0).notNull(),
  },
  (t) => {
    return {
      encounterParticipantIndex: index("encounter_participant_index").on(
        t.encounter_participant_id
      ),
      statusEffectIndex: index("status_effect_index").on(t.status_effect_id),
    };
  }
);

export const encounter_participant = pgTable(
  "encounter_participant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_id: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    creature_id: uuid("creature_id")
      .references(() => creatures.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    initiative: integer("initiative").default(0).notNull(),
    hp: integer("hp").default(0).notNull(),
    is_active: boolean("is_active").default(false).notNull(),
    has_surprise: boolean("has_surprise").default(false).notNull(),
    minion_count: integer("minion_count"),
    has_played_this_round: boolean("has_played_this_round")
      .default(false)
      .notNull(),
  },
  (table) => {
    return {
      encounterIndex: index("encounter_index").on(table.encounter_id),
      creatureIndex: index("creature_index").on(table.creature_id),
    };
  }
);

export const settings = pgTable("settings", {
  user_id: text("user_id").primaryKey(),
  show_health_in_discord: boolean("show_health_in_discord")
    .default(false)
    .notNull(),
  show_icons_in_discord: boolean("show_icons_in_discord")
    .default(true)
    .notNull(),
  average_turn_seconds: integer("average_turn_seconds").default(180).notNull(),
  default_player_level: integer("default_player_level").default(1).notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: varchar("username", { length: 256 }).notNull(),
  avatar: varchar("avatar", { length: 256 }),
  discord_id: text("discord_id").notNull(),
});

export const session = pgTable("user_session", {
  id: varchar("id", {
    length: 256,
  }).primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  active_expires: bigint("active_expires", {
    mode: "number",
  }).notNull(),
  idle_expires: bigint("idle_expires", {
    mode: "number",
  }).notNull(),
});

export const key = pgTable("user_key", {
  id: varchar("id", {
    length: 256,
  }).primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hashed_password: varchar("hashed_password", {
    length: 256,
  }),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  channel_id: bigint("channel_id", { mode: "number" }).notNull(),
  message_id: bigint("message_id", { mode: "number" }),
  discord_user_id: bigint("discord_user_id", { mode: "number" }).notNull(),
});
