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
} from "drizzle-orm/pg-core";

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }),
    description: varchar("description", { length: 256 }),
    started_at: timestamp("started_at"),
    created_at: timestamp("created_at").defaultNow(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    is_player: boolean("is_player"),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => {
    return {
      userIndex: index("user_index").on(t.user_id),
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
  show_health_in_discord: boolean("show_health_in_discord").default(false),
  show_icons_in_discord: boolean("show_icons_in_discord").default(true),
  average_turn_seconds: integer("average_turn_seconds").default(180).notNull(),
  default_player_level: integer("default_player_level").default(1).notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: varchar("username", { length: 256 }).notNull(),
  avatar: varchar("avatar", { length: 256 }),
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
