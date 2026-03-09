import { pgTable, pgEnum, serial, text, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Local authentication table for email/password login.
 * Separate from OAuth users to support multiple auth methods.
 */
export const localAuth = pgTable("localAuth", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LocalAuth = typeof localAuth.$inferSelect;
export type InsertLocalAuth = typeof localAuth.$inferInsert;

/**
 * Game scores table for leaderboard.
 * Stores player scores with timestamp for ranking.
 */
export const gameScores = pgTable("gameScores", {
  id: serial("id").primaryKey(),
  userId: serial("userId").notNull(),
  score: serial("score").notNull(),
  gameMode: varchar("gameMode", { length: 64 }).default("singleplayer").notNull(),
  enemiesKilled: serial("enemiesKilled").default(0).notNull(),
  timePlayedSeconds: serial("timePlayedSeconds").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = typeof gameScores.$inferInsert;

// TODO: Add your tables here
