import {
  users,
  conversations,
  messages,
  searchResults,
  attachments,
  messageAttachments,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type SearchResult,
  type InsertSearchResult,
  type Attachment,
  type InsertAttachment,
  type MessageAttachment,
  type InsertMessageAttachment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { MongoStorage } from "./mongoStorage";
import { LocalStorage } from "./localStorage";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  getUserConversations(userId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  getConversation(conversationId: string, userId: string): Promise<Conversation | undefined>;
  updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
  
  // Message operations
  getConversationMessages(conversationId: string, userId: string, limit?: number, offset?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Search operations
  getCachedSearchResults(query: string, type: string): Promise<SearchResult | undefined>;
  cacheSearchResults(searchResult: InsertSearchResult): Promise<SearchResult>;
  cleanupOldSearchCache(olderThanMs?: number): Promise<void>;
  
  // File attachment operations
  createAttachment(userId: string, attachment: InsertAttachment): Promise<Attachment>;
  getAttachment(attachmentId: string, userId: string): Promise<Attachment | undefined>;
  getUserAttachments(userId: string, limit?: number, offset?: number): Promise<Attachment[]>;
  getMessageAttachments(messageId: string, userId: string): Promise<Attachment[]>;
  linkAttachmentToMessage(messageId: string, attachmentId: string): Promise<MessageAttachment>;
  unlinkAttachmentFromMessage(messageId: string, attachmentId: string): Promise<void>;
  deleteAttachment(attachmentId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Conversation operations
  async getUserConversations(userId: string, limit: number = 50, offset: number = 0): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async createConversation(userId: string, conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({ ...conversation, userId })
      .returning();
    return newConversation;
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ));
    return conversation;
  }

  async updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void> {
    await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ));
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await db
      .delete(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ));
  }

  // Message operations
  async getConversationMessages(conversationId: string, userId: string, limit: number = 100, offset: number = 0): Promise<Message[]> {
    // First verify the conversation belongs to the user
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit)
      .offset(offset);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values([message])
      .returning();
    return newMessage;
  }

  // Search operations
  async getCachedSearchResults(query: string, type: string): Promise<SearchResult | undefined> {
    const [result] = await db
      .select()
      .from(searchResults)
      .where(and(
        eq(searchResults.query, query),
        eq(searchResults.type, type)
      ))
      .orderBy(desc(searchResults.createdAt))
      .limit(1);
    
    // Return cached results if they are less than 1 hour old
    if (result && result.createdAt && (Date.now() - result.createdAt.getTime()) < CACHE_TTL_MS) {
      return result;
    }
    return undefined;
  }

  async cacheSearchResults(searchResult: InsertSearchResult): Promise<SearchResult> {
    const [newResult] = await db
      .insert(searchResults)
      .values(searchResult)
      .returning();
    return newResult;
  }

  async cleanupOldSearchCache(olderThanMs: number = CACHE_TTL_MS * 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanMs);
    await db
      .delete(searchResults)
      .where(lt(searchResults.createdAt, cutoffDate));
  }

  // File attachment operations
  async createAttachment(userId: string, attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db
      .insert(attachments)
      .values({ ...attachment, userId })
      .returning();
    return newAttachment;
  }

  async getAttachment(attachmentId: string, userId: string): Promise<Attachment | undefined> {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(and(
        eq(attachments.id, attachmentId),
        eq(attachments.userId, userId)
      ));
    return attachment;
  }

  async getUserAttachments(userId: string, limit: number = 50, offset: number = 0): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.userId, userId))
      .orderBy(desc(attachments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getMessageAttachments(messageId: string, userId: string): Promise<Attachment[]> {
    // First verify the message belongs to a conversation owned by the user
    const [message] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, messageId));
    
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await this.getConversation(message.conversationId, userId);
    if (!conversation) {
      throw new Error("Access denied");
    }

    return await db
      .select({
        id: attachments.id,
        userId: attachments.userId,
        filename: attachments.filename,
        originalName: attachments.originalName,
        mimeType: attachments.mimeType,
        size: attachments.size,
        path: attachments.path,
        isPublic: attachments.isPublic,
        metadata: attachments.metadata,
        createdAt: attachments.createdAt,
      })
      .from(messageAttachments)
      .innerJoin(attachments, eq(messageAttachments.attachmentId, attachments.id))
      .where(eq(messageAttachments.messageId, messageId));
  }

  async linkAttachmentToMessage(messageId: string, attachmentId: string): Promise<MessageAttachment> {
    const [link] = await db
      .insert(messageAttachments)
      .values({ messageId, attachmentId })
      .returning();
    return link;
  }

  async unlinkAttachmentFromMessage(messageId: string, attachmentId: string): Promise<void> {
    await db
      .delete(messageAttachments)
      .where(and(
        eq(messageAttachments.messageId, messageId),
        eq(messageAttachments.attachmentId, attachmentId)
      ));
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    await db
      .delete(attachments)
      .where(and(
        eq(attachments.id, attachmentId),
        eq(attachments.userId, userId)
      ));
  }
}

// Constants
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

// Storage factory - choose storage type based on environment
function createStorage(): IStorage {
  const storageType = process.env.STORAGE_TYPE || 'database';
  
  switch (storageType.toLowerCase()) {
    case 'mongodb':
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/ai-chat';
      return new MongoStorage(mongoUrl);
    
    case 'local':
    case 'memory':
      return new LocalStorage();
    
    case 'database':
    case 'postgres':
    default:
      return new DatabaseStorage();
  }
}

export const storage = createStorage();
