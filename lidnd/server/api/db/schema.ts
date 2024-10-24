import { type InferInsertModel, relations } from "drizzle-orm";
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
  unique,
  doublePrecision,
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

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  encounter_id: uuid("encounter_id")
    .references(() => encounters.id, { onDelete: "cascade" })
    .notNull(),
  reminder: text("reminder"),
  alert_after_round: integer("alert_after_round").notNull(),
});

//TODO: relations are weird. I wish drizzle could infer from the keys. relation names have to be identical
// Follow this issue for changes: https://github.com/drizzle-team/drizzle-orm/issues/2026
// oddly enough, seems to be working without explicit relationNames now? well, studio is broken

export const reminderRelations = relations(reminders, ({ one }) => ({
  encounter: one(encounters, {
    fields: [reminders.encounter_id],
    references: [encounters.id],
  }),
}));

export const initiative_enum = pgEnum("initiative_type", ["linear", "group"]);
export const encounter_label_enum = pgEnum("encounter_label", [
  "active",
  "inactive",
]);

export const encounter_status = ["roll", "surprise", "prep", "run"] as const;
export type EncounterStatus = (typeof encounter_status)[number];

export const encounter_status_enum = pgEnum(
  "encounter_status",
  encounter_status
);

export const systems = pgTable("systems", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  initiative_type: initiative_enum("initiative_type")
    .default("linear")
    .notNull(),
});

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    system_id: uuid("system_id")
      .notNull()
      .references(() => systems.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().default(""),
    description: text("description"),
    party_level: integer("party_level").notNull().default(1),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      userIndex: index("user_index_campaigns").on(t.user_id),
      unq: unique().on(t.user_id, t.name),
    };
  }
);

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
  system: one(systems, {
    fields: [campaigns.system_id],
    references: [systems.id],
  }),
  encounters: many(encounters),
  campaignToPlayers: many(campaignToPlayer),
}));

export const campaignToPlayer = pgTable(
  "campaign_to_player",
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

export const campaignToPlayerRelations = relations(
  campaignToPlayer,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignToPlayer.campaign_id],
      references: [campaigns.id],
    }),
    player: one(creatures, {
      fields: [campaignToPlayer.player_id],
      references: [creatures.id],
    }),
  })
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().default("Unnamed encounter"),
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
    status: encounter_status_enum("status").default("prep").notNull(),
    label: encounter_label_enum("label").default("active").notNull(),
    order: doublePrecision("order").default(1).notNull(),
    index_in_campaign: integer("index_in_campaign").notNull().default(0),
  },
  (t) => {
    return {
      userIndex: index("user_index").on(t.user_id),
    };
  }
);

export const encountersRelations = relations(encounters, ({ many, one }) => ({
  participants: many(participants),
  reminders: many(reminders),
  campaigns: one(campaigns, {
    fields: [encounters.campaign_id],
    references: [campaigns.id],
  }),
}));

//todo: there are system-specific fields in here...
//todo: maybe separate creatures and players? players have a designated "player" creature?
export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_id: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    creature_id: uuid("creature_id")
      .references(() => creatures.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    is_ally: boolean("is_ally").default(false).notNull(),
    initiative: integer("initiative").default(0).notNull(),
    hp: integer("hp").default(1).notNull(),
    is_active: boolean("is_active").default(false).notNull(),
    has_surprise: boolean("has_surprise").default(false).notNull(),
    minion_count: integer("minion_count"),
    nickname: text("nickname"),
    hex_color: text("hex_color"),
    notes: text("notes"),
    temporary_hp: integer("temporary_hp").default(0).notNull(),
    grid_column_id: uuid("grid_column_id"),
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

export const participantRelations = relations(
  participants,
  ({ one, many }) => ({
    encounter: one(encounters, {
      fields: [participants.encounter_id],
      references: [encounters.id],
    }),
    creature: one(creatures, {
      fields: [participants.creature_id],
      references: [creatures.id],
    }),
    status_effects: many(participant_status_effects),
  })
);

export const creatures = pgTable(
  "creatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    icon_width: integer("image_width").default(250).notNull(),
    icon_height: integer("image_height").default(250).notNull(),
    stat_block_width: integer("stat_block_width").default(250).notNull(),
    stat_block_height: integer("stat_block_height").default(250).notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    max_hp: integer("max_hp").notNull().default(1),
    initiative_bonus: integer("initiative_bonus").default(0).notNull(),
    challenge_rating: real("challenge_rating").default(0).notNull(),
    is_player: boolean("is_player").default(false).notNull(),
    col_span: integer("col_span"),
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

export const creatureRelations = relations(creatures, ({ many }) => ({
  participants: many(participants),
}));

export const status_effects = pgTable("status_effects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description").notNull(),
});

export const statusEffectRelations = relations(status_effects, ({ many }) => ({
  participantEffects: many(participant_status_effects),
}));

export const participant_status_effects = pgTable(
  "participant_status_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_participant_id: uuid("encounter_participant_id")
      .references(() => participants.id, { onDelete: "cascade" })
      .notNull(),
    status_effect_id: uuid("status_effect_id")
      .references(() => status_effects.id, { onDelete: "cascade" })
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

export const participantEffectsRelations = relations(
  participant_status_effects,
  ({ one }) => ({
    effect: one(status_effects, {
      fields: [participant_status_effects.status_effect_id],
      references: [status_effects.id],
    }),
    participant: one(participants, {
      fields: [participant_status_effects.encounter_participant_id],
      references: [participants.id],
    }),
  })
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
  enable_minions: boolean("enable_minions").default(false).notNull(),
  collapse_sidebar: boolean("collapse_sidebar").default(false).notNull(),
});

// renamed this table to get avoid having to cast id
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: varchar("username", { length: 256 }).notNull(),
  avatar: varchar("avatar", { length: 256 }),
  discord_id: text("discord_id").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  channel_id: bigint("channel_id", { mode: "number" }).notNull(),
  message_id: bigint("message_id", { mode: "number" }),
  discord_user_id: bigint("discord_user_id", { mode: "number" }).notNull(),
});
