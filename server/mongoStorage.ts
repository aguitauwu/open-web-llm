import { MongoClient, Db, Collection } from 'mongodb';
import {
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
} from "@shared/schema";
import { IStorage } from "./storage";

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private conversations: Collection<Conversation>;
  private messages: Collection<Message>;
  private searchResults: Collection<SearchResult>;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db('ai-chat');
    this.users = this.db.collection('users');
    this.conversations = this.db.collection('conversations');
    this.messages = this.db.collection('messages');
    this.searchResults = this.db.collection('searchResults');
  }

  async connect() {
    await this.client.connect();
    console.log('Connected to MongoDB');
  }

  async disconnect() {
    await this.client.close();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = {
      ...userData,
      updatedAt: new Date(),
      createdAt: new Date()
    };
    
    await this.users.updateOne(
      { id: userData.id },
      { $set: user, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    
    return user as User;
  }

  // Conversation operations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.conversations
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    return conversations;
  }

  async createConversation(userId: string, conversation: InsertConversation): Promise<Conversation> {
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...conversation,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.conversations.insertOne(newConversation);
    return newConversation as Conversation;
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const conversation = await this.conversations.findOne({ id: conversationId, userId });
    return conversation || undefined;
  }

  async updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void> {
    await this.conversations.updateOne(
      { id: conversationId, userId },
      { $set: { title, updatedAt: new Date() } }
    );
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.conversations.deleteOne({ id: conversationId, userId });
    await this.messages.deleteMany({ conversationId });
  }

  // Message operations
  async getConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
    // Verify user has access to conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = await this.messages
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();
    return messages;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      metadata: message.metadata || null,
      createdAt: new Date()
    };
    
    await this.messages.insertOne(newMessage);
    
    // Update conversation's updatedAt
    await this.conversations.updateOne(
      { id: message.conversationId },
      { $set: { updatedAt: new Date() } }
    );
    
    return newMessage as Message;
  }

  // Search operations
  async getCachedSearchResults(query: string, type: string): Promise<SearchResult | undefined> {
    const result = await this.searchResults.findOne({ query, type });
    return result || undefined;
  }

  async cacheSearchResults(searchResult: InsertSearchResult): Promise<SearchResult> {
    const newSearchResult = {
      id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...searchResult,
      createdAt: new Date()
    };
    
    await this.searchResults.updateOne(
      { query: searchResult.query, type: searchResult.type },
      { $set: newSearchResult },
      { upsert: true }
    );
    
    return newSearchResult as SearchResult;
  }

  async cleanupOldSearchCache(olderThanMs: number = 60 * 60 * 1000 * 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanMs);
    await this.searchResults.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
  }

  // File attachment operations - TODO: Implement for MongoDB
  async createAttachment(userId: string, attachment: InsertAttachment): Promise<Attachment> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async getAttachment(attachmentId: string, userId: string): Promise<Attachment | undefined> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async getUserAttachments(userId: string, limit?: number, offset?: number): Promise<Attachment[]> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async getMessageAttachments(messageId: string, userId: string): Promise<Attachment[]> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async linkAttachmentToMessage(messageId: string, attachmentId: string): Promise<MessageAttachment> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async unlinkAttachmentFromMessage(messageId: string, attachmentId: string): Promise<void> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    throw new Error("File attachments not implemented for MongoDB storage");
  }
}