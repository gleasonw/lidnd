import { booleanSchema } from "@/app/[username]/utils";
import { z } from "zod";
import {
  type InferInsertModel,
  type InferSelectModel,
  relations,
} from "drizzle-orm";
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
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { creatureTypes } from "@/server/constants";

export type DbSpell = InferInsertModel<typeof spells>;
export type EncounterInsert = Omit<
  InferInsertModel<typeof encounters>,
  "user_id"
>;
export type ParticipantInsert = InferInsertModel<typeof participants>;

export type LidndImage = InferSelectModel<typeof images>;
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  width: integer("width").notNull().default(100),
  height: integer("height").notNull().default(100),
});

export const imageRelations = relations(images, ({ many }) => ({
  encounterAssets: many(encounterAsset),
  creatures: many(creatures),
}));

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
export const target_difficulty_enum = pgEnum("difficulty", [
  "easy",
  "standard",
  "hard",
]);

export const encounter_status = ["prep", "run"] as const;
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

// previously we had a systems table, but really, we're not going to support dynamic system adds like that.
// just hardcoded systems.
export const systemsEnumValues = ["dnd5e", "drawsteel"] as const;
export const systemEnum = pgEnum("system_enum", systemsEnumValues);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    system_id: uuid("system_id").references(() => systems.id, {
      onDelete: "cascade",
    }),
    system: systemEnum("system").notNull().default("dnd5e"),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().default(""),
    description: text("description"),
    party_level: integer("party_level").notNull().default(1),
    focused_encounter_id: uuid("focused_encounter_id"),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    is_archived: boolean("is_archived").default(false).notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      userIndex: index("user_index_campaigns").on(t.user_id),
      // unq: unique().on(t.user_id, t.name),
      // TODO: can we make this unique again?
    };
  }
);

export type CampaignInsert = InferInsertModel<typeof campaigns>;

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
  legacySystem: one(systems, {
    fields: [campaigns.system_id],
    references: [systems.id],
  }),
  encounters: many(encounters),
  campaignToPlayers: many(campaignToPlayer),
  creatureLinks: many(campaignCreatureLink),
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

export type GameSession = InferSelectModel<typeof gameSessions>;
export type SessionPost = InferInsertModel<typeof gameSessions>;
export const gameSessions = pgTable(
  "gameSessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaign_id: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    created_at: timestamp("created_at").defaultNow(),
    started_at: timestamp("started_at"),
    ended_at: timestamp("ended_at"),
    victory_count: integer("victory_count").default(0).notNull(),
  },
  (t) => {
    return {
      userIndex: index("user_index_game_sessions").on(t.user_id),
    };
  }
);

export const gameSessionRelations = relations(
  gameSessions,
  ({ one, many }) => ({
    campaign: one(campaigns, {
      fields: [gameSessions.campaign_id],
      references: [campaigns.id],
    }),
    encounters: many(encounters),
  })
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().default(""),
    target_difficulty: target_difficulty_enum("target_difficulty")
      .default("standard")
      .notNull(),
    description: text("description"),
    malice: integer("malice").default(0).notNull(),
    started_at: timestamp("started_at"),
    ended_at: timestamp("ended_at"),
    created_at: timestamp("created_at").defaultNow(),
    session_id: uuid("session_id").references(() => gameSessions.id, {
      onDelete: "set null",
    }),
    campaign_id: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    current_round: integer("current_round").default(1).notNull(),
    is_editing_columns: boolean("is_editing_columns").default(true).notNull(),
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
  session: one(gameSessions, {
    fields: [encounters.session_id],
    references: [gameSessions.id],
  }),
  campaigns: one(campaigns, {
    fields: [encounters.campaign_id],
    references: [campaigns.id],
  }),
  columns: many(stat_columns),
  turn_groups: many(turn_groups),
  tags: many(encounter_to_tag),
  assets: many(encounterAsset),
}));

export type EncounterAsset = InferSelectModel<typeof encounterAsset>;
export const encounterAsset = pgTable("encounter_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  encounter_id: uuid("encounter_id")
    .references(() => encounters.id, { onDelete: "cascade" })
    .notNull(),
  asset_id: uuid("asset_id")
    .references(() => images.id, { onDelete: "cascade" })
    .notNull(),
  //TODO: potentially an issue here if somehow an encounter asset gets assigned to a stat column from another encounter. that would be pretty wild, but possible
  stat_column_id: uuid("stat_column_id").references(() => stat_columns.id, {
    onDelete: "set null",
  }),
});

export const encounterAssetRelations = relations(encounterAsset, ({ one }) => ({
  encounter: one(encounters, {
    fields: [encounterAsset.encounter_id],
    references: [encounters.id],
  }),
  image: one(images, {
    fields: [encounterAsset.asset_id],
    references: [images.id],
  }),
  column: one(stat_columns, {
    fields: [encounterAsset.stat_column_id],
    references: [stat_columns.id],
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
    max_hp_override: integer("max_hp_override"),
    /**todo: probably this should be on the encounter state. we don't want there to be two participants, both declaring is_active, and this
     * model allows for that
     */
    is_active: boolean("is_active").default(false).notNull(),
    // TODO: inanimate is a hack flag to allow malice and other things the dm needs to track to sit inside the
    // column layout. really we should have some "encounter element" system that lets us add things
    // to the column layout without those things becoming participants.
    /** @deprecated creatures have inanimate set globally now */
    inanimate: boolean("inanimate").default(false).notNull(),
    minion_count: integer("minion_count"),
    nickname: text("nickname"),
    hex_color: text("hex_color"),
    notes: text("notes"),
    temporary_hp: integer("temporary_hp").default(0).notNull(),
    column_id: uuid("stat_column_id").references(() => stat_columns.id, {
      onDelete: "set null",
    }),
    turn_group_id: uuid("turn_group_id").references(() => turn_groups.id, {
      onDelete: "set null",
    }),
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

export const stat_columns = pgTable(
  "stat_columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    percent_width: doublePrecision("percent_width").notNull(),
    /** the column where encounter description, roster goes... can't be deleted, should only be one */
    is_home_column: boolean("is_home_column").default(false).notNull(),
    encounter_id: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => {
    return {
      encounterIndex: index("stat_column_encounter_index").on(
        table.encounter_id
      ),
    };
  }
);
export type StatColumnInsert = InferInsertModel<typeof stat_columns>;

export const statColumnRelations = relations(stat_columns, ({ one, many }) => ({
  encounter: one(encounters, {
    fields: [stat_columns.encounter_id],
    references: [encounters.id],
  }),
  participants: many(participants),
  assets: many(encounterAsset),
}));

export type EncounterTag = InferSelectModel<typeof encounter_tags>;
export const encounter_tags = pgTable(
  "encounter_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => {
    return {
      userIndex: index("user_index_encounter_tags").on(t.user_id),
    };
  }
);

export const encounterTagRelations = relations(
  encounter_tags,
  ({ one, many }) => ({
    user: one(users, {
      fields: [encounter_tags.user_id],
      references: [users.id],
    }),
    encounterLinks: many(encounter_to_tag),
  })
);

export const encounter_to_tag = pgTable(
  "encounter_to_tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_id: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    tag_id: uuid("tag_id")
      .notNull()
      .references(() => encounter_tags.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => {
    return {
      encounterIndex: index("encounter_to_tag_encounter_index").on(
        t.encounter_id
      ),
      tagIndex: index("encounter_to_tag_tag_index").on(t.tag_id),
    };
  }
);

export const encounterToTagRelations = relations(
  encounter_to_tag,
  ({ one }) => ({
    encounter: one(encounters, {
      fields: [encounter_to_tag.encounter_id],
      references: [encounters.id],
    }),
    tag: one(encounter_tags, {
      fields: [encounter_to_tag.tag_id],
      references: [encounter_tags.id],
    }),
  })
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
    column: one(stat_columns, {
      fields: [participants.column_id],
      references: [stat_columns.id],
    }),
    turn_group: one(turn_groups, {
      fields: [participants.turn_group_id],
      references: [turn_groups.id],
    }),
  })
);

export type CreatureInsert = InferInsertModel<typeof creatures>;

export const creatureTypeEnum = pgEnum("creature_type", creatureTypes);

export const creatures = pgTable(
  "creatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    icon_width: integer("image_width").default(250).notNull(),
    icon_height: integer("image_height").default(250).notNull(),
    stat_block_width: integer("stat_block_width").default(250).notNull(),
    stat_block_height: integer("stat_block_height").default(250).notNull(),
    /**slowly migrating to using a ref'd asset instead of inferring from creature fields. this should be SOT */
    stat_block_asset: uuid("stat_block_asset").references(() => images.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").defaultNow().notNull(),
    max_hp: integer("max_hp").notNull().default(1),
    initiative_bonus: integer("initiative_bonus").default(0).notNull(),
    challenge_rating: real("challenge_rating").default(0).notNull(),
    type: creatureTypeEnum("creature_type")
      .notNull()
      .default("standard_monster"),

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

export const creatureRelations = relations(creatures, ({ many, one }) => ({
  participants: many(participants),
  campaignLinks: many(campaignCreatureLink),
  statBlockAsset: one(images, {
    fields: [creatures.stat_block_asset],
    references: [images.id],
  }),
}));

export const campaignCreatureLink = pgTable(
  "campaign_creature_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaign_id: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    creature_id: uuid("creature_id")
      .notNull()
      .references(() => creatures.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      campaignIndex: index("campaign_index_link").on(t.campaign_id),
      creatureIndex: index("creature_index_link").on(t.creature_id),
    };
  }
);

export const status_effects = pgTable("status_effects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description").notNull(),
});

export const statusEffectRelations = relations(status_effects, ({ many }) => ({
  participantEffects: many(participant_status_effects),
}));

export const turn_groups = pgTable(
  "turn_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounter_id: uuid("encounter_id")
      .references(() => encounters.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 256 }),
    is_active: boolean("is_active").default(false).notNull(),
    has_played_this_round: boolean("has_played_this_round")
      .default(false)
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    hex_color: text("hex_color"),
  },
  (t) => {
    return {
      encounterIndex: index("turn_group_encounter_index").on(t.encounter_id),
    };
  }
);
export const turnGroupSelectSchema = createSelectSchema(turn_groups);
export const turnGroupInsertSchema = createInsertSchema(turn_groups);
export type TurnGroup = InferSelectModel<typeof turn_groups>;
export type TurnGroupInsert = InferInsertModel<typeof turn_groups>;

export const turn_group_relations = relations(turn_groups, ({ one, many }) => ({
  encounter: one(encounters, {
    fields: [turn_groups.encounter_id],
    references: [encounters.id],
  }),
  participants: many(participants),
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

//#region validators

export const encounterSelectSchema = createSelectSchema(encounters);
export const participantSchema = createSelectSchema(participants);
export const insertSettingsSchema = createInsertSchema(settings);
export const updateEncounterSchema = createInsertSchema(encounters);
export const updateCampaignSchema = createInsertSchema(campaigns);
export const encounterInsertSchema = createInsertSchema(encounters);
export const reminderInsertSchema = createInsertSchema(reminders);
export const creaturesSchema = createSelectSchema(creatures);
export const gameSessionSchema = createInsertSchema(gameSessions);

export const updateSettingsSchema = insertSettingsSchema
  .omit({ user_id: true })
  .merge(
    z.object({
      show_health_in_discord: booleanSchema,
      show_icons_in_discord: booleanSchema,
      average_turn_seconds: z.coerce.number(),
    })
  );
export const insertCreatureSchema = createInsertSchema(creatures);
export const participantInsertSchema = createInsertSchema(participants);
export const creatureUploadSchema = insertCreatureSchema
  .extend({
    max_hp: z.coerce.number().gt(0),
    challenge_rating: z.coerce.number(),
    column_id: z.string().optional(),
  })
  .omit({ user_id: true });

export type CreaturePost = z.infer<typeof creatureUploadSchema>;
export type GameSessionPost = z.infer<typeof gameSessionSchema>;
// encounter_id will be provided by hook
// creature_id will come after creature is inserted

export const participantCreateSchema = z.object({
  participant: participantInsertSchema.extend({
    creature_id: z.string().optional(),
  }),
  creature: creatureUploadSchema,
});

export type ParticipantPost = z.infer<typeof participantCreateSchema>;
