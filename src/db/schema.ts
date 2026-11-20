import { boolean, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import type { StreamSnapshot } from "@/lib/types";

export const workspaces = pgTable("streamly_workspaces", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const streamers = pgTable("streamly_streamers", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 25 }).notNull(),
  favorite: boolean("favorite").default(false).notNull(),
  isDemo: boolean("is_demo").default(false).notNull(),
  snapshot: jsonb("snapshot").$type<StreamSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("streamly_workspace_username_idx").on(table.workspaceId, table.username)]);
