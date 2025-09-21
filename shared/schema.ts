import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índice compuesto para consultas por fecha de creación (email ya está indexado por UNIQUE)
  index("idx_users_created").on(table.createdAt),
]);

// Chat conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  model: varchar("model").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Índice compuesto principal para consultas por usuario ordenadas por fecha de actualización
  index("idx_conversations_user_updated").on(table.userId, table.updatedAt),
]);

// Chat messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing search results, model info, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Índice principal para consultas frecuentes de mensajes por conversación ordenados por fecha
  index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
]);

// Search results cache
export const searchResults = pgTable("search_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  type: varchar("type").notNull(), // 'web' or 'youtube'
  results: jsonb("results").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Índice único para cache de búsquedas (evita duplicados)
  index("idx_search_query_type").on(table.query, table.type),
  // Índice para limpiar cache antiguo por fecha
  index("idx_search_created").on(table.createdAt),
]);

// File attachments
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  path: text("path").notNull(), // Local file path or cloud URL
  isPublic: boolean("is_public").default(false),
  metadata: jsonb("metadata"), // Additional file metadata (dimensions, duration, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Índice para consultas por usuario
  index("idx_attachments_user").on(table.userId),
  // Índice para búsquedas por tipo de archivo
  index("idx_attachments_mime_type").on(table.mimeType),
  // Índice para consultas por fecha
  index("idx_attachments_created").on(table.createdAt),
]);

// Message attachments (many-to-many relationship)
export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  attachmentId: uuid("attachment_id").notNull().references(() => attachments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Índice único para evitar duplicados
  index("idx_message_attachments_unique").on(table.messageId, table.attachmentId),
  // Índice para consultas por mensaje
  index("idx_message_attachments_message").on(table.messageId),
  // Índice para consultas por archivo
  index("idx_message_attachments_attachment").on(table.attachmentId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  attachments: many(attachments),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  messageAttachments: many(messageAttachments),
}));

export const attachmentsRelations = relations(attachments, ({ one, many }) => ({
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
  messageAttachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
  attachment: one(attachments, {
    fields: [messageAttachments.attachmentId],
    references: [attachments.id],
  }),
}));

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  model: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

export const insertSearchResultSchema = createInsertSchema(searchResults).pick({
  query: true,
  type: true,
  results: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).pick({
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  isPublic: true,
  metadata: true,
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).pick({
  messageId: true,
  attachmentId: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Extended user type for authentication with demo mode
export interface AuthUser extends User {
  isDemo?: boolean;
}

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
