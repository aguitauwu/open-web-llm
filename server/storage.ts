import {
  users,
  conversations,
  messages,
  searchResults,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type SearchResult,
  type InsertSearchResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { MongoStorage } from "./mongoStorage";
import { LocalStorage } from "./localStorage";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  getUserConversations(userId: string): Promise<Conversation[]>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  getConversation(conversationId: string, userId: string): Promise<Conversation | undefined>;
  updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
  
  // Message operations
  getConversationMessages(conversationId: string, userId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Search operations
  getCachedSearchResults(query: string, type: string): Promise<SearchResult | undefined>;
  cacheSearchResults(searchResult: InsertSearchResult): Promise<SearchResult>;
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
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
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
  async getConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
    // First verify the conversation belongs to the user
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
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
