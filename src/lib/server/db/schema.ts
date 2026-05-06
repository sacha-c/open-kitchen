import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const languageEnum = pgEnum("language", ["en", "es", "ca"]);
export const speedEnum = pgEnum("speed", [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    precision: 6,
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const cecotecCredentials = pgTable("cecotec_credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  cecotecUserId: text("cecotec_user_id"),
  // Cached on first sync by calling the deviceBaseInfo endpoint.
  // Each user's machine has its own model code (e.g. "MamboTouch").
  modelCode: text("model_code"),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const recipe = pgTable("recipe", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  servings: text("servings").notNull().default("2"),
  cookingTime: integer("cooking_time").notNull(),
  language: languageEnum().notNull().default("en"),
  imageUrl: text("image_url"),
  cecotecRecipeId: text("cecotec_recipe_id"),
  cecotecNumber: text("cecotec_number"),
  syncStatus: text("sync_status").notNull().default("pending"),
  syncError: text("sync_error"),
  syncedAt: timestamp("synced_at", {
    precision: 6,
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp("updated_at", {
    precision: 6,
    withTimezone: true,
  }).notNull(),
});

export const recipeStep = pgTable("recipe_step", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  description: varchar("description", { length: 1000 }).notNull(),
  operationType: integer("operation_type").notNull(),
  totalTime: integer("total_time").notNull().default(0),
  speed: speedEnum().notNull().default("0"),
  temperature: integer("temperature").notNull().default(0),
  power: integer("power").notNull().default(0),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
});

export const recipeIngredient = pgTable("recipe_ingredient", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipe.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  amount: text("amount").notNull(),
  unit: text("unit").notNull(),
  cecotecIngredientId: text("cecotec_ingredient_id"),
  cecotecUnitId: text("cecotec_unit_id"),
});
