import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  vector,
  primaryKey,
  index,
  integer
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 768;
export const MAX_ENTRY_CHARS = 1500;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    projectIdx: index("spaces_project_idx").on(table.projectId)
  })
);

export const projectMembers = pgTable(
  "project_members",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    projectRole: text("project_role", { enum: ["admin", "member"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.projectId] })
  })
);

export const spaceMembers = pgTable(
  "space_members",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    spaceRole: text("space_role", { enum: ["editor", "reader"] }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.spaceId] }),
    projectIdx: index("space_members_project_idx").on(table.projectId)
  })
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    source: text("source", { enum: ["user_generated", "dashboard_session"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
  },
  (table) => ({
    userIdx: index("api_keys_user_idx").on(table.userId)
  })
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    projectIdx: index("entries_project_idx").on(table.projectId),
    spaceIdx: index("entries_space_idx").on(table.spaceId),
    statusIdx: index("entries_status_idx").on(table.status),
    embeddingIdx: index("entries_embedding_idx")
      .using("ivfflat", sql`${table.embedding} vector_cosine_ops`)
      .with({ lists: 100 })
  })
);

export const entryVersions = pgTable(
  "entry_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    title: text("title"),
    changedBy: uuid("changed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    rationale: text("rationale").notNull(),
    version: integer("version").notNull()
  },
  (table) => ({
    entryIdx: index("entry_versions_entry_idx").on(table.entryId),
    entryVersionIdx: index("entry_versions_entry_version_idx").on(table.entryId, table.version)
  })
);

export const pendingChanges = pgTable(
  "pending_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["new", "edit", "archive"] }).notNull(),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "cascade" }),
    proposedContent: text("proposed_content"),
    proposedTitle: text("proposed_title"),
    proposedBy: uuid("proposed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    rationale: text("rationale").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    projectIdx: index("pending_changes_project_idx").on(table.projectId),
    spaceIdx: index("pending_changes_space_idx").on(table.spaceId),
    statusIdx: index("pending_changes_status_idx").on(table.status)
  })
);

export const pendingInvitations = pgTable(
  "pending_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    email: text("email"),
    token: text("token").unique(),
    projectRole: text("project_role", { enum: ["admin", "member"] }).notNull(),
    spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "cascade" }),
    spaceRole: text("space_role", { enum: ["editor", "reader"] }),
    invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailIdx: index("pending_invitations_email_idx").on(table.email),
    tokenIdx: index("pending_invitations_token_idx").on(table.token),
    projectIdx: index("pending_invitations_project_idx").on(table.projectId)
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type SpaceMember = typeof spaceMembers.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type EntryVersion = typeof entryVersions.$inferSelect;
export type PendingChange = typeof pendingChanges.$inferSelect;
export type NewPendingChange = typeof pendingChanges.$inferInsert;
export type PendingInvitation = typeof pendingInvitations.$inferSelect;
export type NewPendingInvitation = typeof pendingInvitations.$inferInsert;

export type ProjectRole = "admin" | "member";
export type SpaceRole = "editor" | "reader";
export type ChangeType = "new" | "edit" | "archive";
export type ChangeStatus = "pending" | "approved" | "rejected";
export type EntryStatus = "active" | "archived";
export type ApiKeySource = "user_generated" | "dashboard_session";
