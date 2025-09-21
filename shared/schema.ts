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
  // Índice para búsquedas por email (ya existe UNIQUE pero mejora performance)
  index("idx_users_email").on(table.email),
  // Índice para consultas por fecha de creación
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
  // Índice para consultas frecuentes de conversaciones por usuario ordenadas por fecha
  index("idx_conversations_user_updated").on(table.userId, table.updatedAt),
  index("idx_conversations_user_created").on(table.userId, table.createdAt),
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
  // Índice para consultas frecuentes de mensajes por conversación ordenados por fecha
  index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
  // Índice para buscar mensajes por rol
  index("idx_messages_role_created").on(table.role, table.createdAt),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;
