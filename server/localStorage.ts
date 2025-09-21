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

export class LocalStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private searchResults: Map<string, SearchResult> = new Map();
  private attachments: Map<string, Attachment> = new Map();
  private messageAttachments: Map<string, MessageAttachment> = new Map();
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.startAutoSave();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const userId = userData.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const existingUser = this.users.get(userId);
    const user = {
      ...userData,
      id: userId,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date()
    } as User;
    
    this.users.set(userId, user);
    return user;
  }

  // Conversation operations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => {
        const aTime = a.updatedAt?.getTime() || 0;
        const bTime = b.updatedAt?.getTime() || 0;
        return bTime - aTime;
      });
    
    return userConversations;
  }

  async createConversation(userId: string, conversation: InsertConversation): Promise<Conversation> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newConversation = {
      id,
      ...conversation,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Conversation;
    
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(conversationId);
    if (conversation && conversation.userId === userId) {
      return conversation;
    }
    return undefined;
  }

  async updateConversationTitle(conversationId: string, userId: string, title: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      this.conversations.set(conversationId, conversation);
    }
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);
    if (conversation) {
      this.conversations.delete(conversationId);
      
      // Delete all messages in this conversation
      const conversationMessages = Array.from(this.messages.entries())
        .filter(([_, message]) => message.conversationId === conversationId);
      
      for (const [messageId] of conversationMessages) {
        this.messages.delete(messageId);
      }
    }
  }

  // Message operations
  async getConversationMessages(conversationId: string, userId: string): Promise<Message[]> {
    // Verify user has access to conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const conversationMessages = Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return aTime - bTime;
      });
    
    return conversationMessages;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newMessage = {
      id,
      ...message,
      createdAt: new Date()
    } as Message;
    
    this.messages.set(id, newMessage);
    
    // Update conversation's updatedAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(message.conversationId, conversation);
    }
    
    return newMessage;
  }

  // Search operations
  async getCachedSearchResults(query: string, type: string): Promise<SearchResult | undefined> {
    const key = `${query}_${type}`;
    return this.searchResults.get(key);
  }

  async cacheSearchResults(searchResult: InsertSearchResult): Promise<SearchResult> {
    const id = `search_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const key = `${searchResult.query}_${searchResult.type}`;
    const newSearchResult = {
      id,
      ...searchResult,
      createdAt: new Date()
    } as SearchResult;
    
    this.searchResults.set(key, newSearchResult);
    return newSearchResult;
  }

  async cleanupOldSearchCache(olderThanMs: number = 60 * 60 * 1000 * 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanMs);
    const keysToDelete: string[] = [];
    
    this.searchResults.forEach((result, key) => {
      if (result.createdAt && result.createdAt < cutoffDate) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.searchResults.delete(key));
  }

  // Utility methods for local storage
  saveToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ai-chat-users', JSON.stringify(Array.from(this.users.entries())));
      localStorage.setItem('ai-chat-conversations', JSON.stringify(Array.from(this.conversations.entries())));
      localStorage.setItem('ai-chat-messages', JSON.stringify(Array.from(this.messages.entries())));
      localStorage.setItem('ai-chat-search', JSON.stringify(Array.from(this.searchResults.entries())));
      localStorage.setItem('ai-chat-attachments', JSON.stringify(Array.from(this.attachments.entries())));
      localStorage.setItem('ai-chat-message-attachments', JSON.stringify(Array.from(this.messageAttachments.entries())));
    }
  }

  loadFromLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        const users = localStorage.getItem('ai-chat-users');
        if (users) {
          this.users = new Map(JSON.parse(users));
        }
        
        const conversations = localStorage.getItem('ai-chat-conversations');
        if (conversations) {
          this.conversations = new Map(JSON.parse(conversations));
        }
        
        const messages = localStorage.getItem('ai-chat-messages');
        if (messages) {
          this.messages = new Map(JSON.parse(messages));
        }
        
        const search = localStorage.getItem('ai-chat-search');
        if (search) {
          this.searchResults = new Map(JSON.parse(search));
        }
        
        const attachments = localStorage.getItem('ai-chat-attachments');
        if (attachments) {
          this.attachments = new Map(JSON.parse(attachments));
        }
        
        const messageAttachments = localStorage.getItem('ai-chat-message-attachments');
        if (messageAttachments) {
          this.messageAttachments = new Map(JSON.parse(messageAttachments));
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }
  }

  // Auto-save functionality
  private startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveToLocalStorage();
    }, 30000);
  }

  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Cleanup method
  destroy() {
    this.stopAutoSave();
    this.saveToLocalStorage(); // Final save
  }

  // File attachment operations
  async createAttachment(userId: string, attachment: InsertAttachment): Promise<Attachment> {
    const attachmentId = `attachment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newAttachment = {
      id: attachmentId,
      userId,
      ...attachment,
      metadata: attachment.metadata || null,
      isPublic: attachment.isPublic || false,
      createdAt: new Date()
    } as Attachment;
    
    this.attachments.set(attachmentId, newAttachment);
    return newAttachment;
  }

  async getAttachment(attachmentId: string, userId: string): Promise<Attachment | undefined> {
    const attachment = this.attachments.get(attachmentId);
    if (attachment && attachment.userId === userId) {
      return attachment;
    }
    return undefined;
  }

  async getUserAttachments(userId: string, limit?: number, offset?: number): Promise<Attachment[]> {
    const userAttachments = Array.from(this.attachments.values())
      .filter(attachment => attachment.userId === userId)
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });
    
    const start = offset || 0;
    const end = limit ? start + limit : userAttachments.length;
    return userAttachments.slice(start, end);
  }

  async getMessageAttachments(messageId: string, userId: string): Promise<Attachment[]> {
    const messageAttachments = Array.from(this.messageAttachments.values())
      .filter(ma => ma.messageId === messageId);
    
    const attachmentIds = messageAttachments.map(ma => ma.attachmentId);
    const attachments = [];
    
    for (const attachmentId of attachmentIds) {
      const attachment = this.attachments.get(attachmentId);
      if (attachment && attachment.userId === userId) {
        attachments.push(attachment);
      }
    }
    
    return attachments;
  }

  async linkAttachmentToMessage(messageId: string, attachmentId: string): Promise<MessageAttachment> {
    const linkId = `msg_att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const messageAttachment = {
      id: linkId,
      messageId,
      attachmentId,
      createdAt: new Date()
    } as MessageAttachment;
    
    this.messageAttachments.set(linkId, messageAttachment);
    return messageAttachment;
  }

  async unlinkAttachmentFromMessage(messageId: string, attachmentId: string): Promise<void> {
    const entries = Array.from(this.messageAttachments.entries());
    for (const [id, ma] of entries) {
      if (ma.messageId === messageId && ma.attachmentId === attachmentId) {
        this.messageAttachments.delete(id);
        break;
      }
    }
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = this.attachments.get(attachmentId);
    if (attachment && attachment.userId === userId) {
      // First remove all message attachments that reference this attachment
      const entries = Array.from(this.messageAttachments.entries());
      for (const [id, ma] of entries) {
        if (ma.attachmentId === attachmentId) {
          this.messageAttachments.delete(id);
        }
      }
      
      // Then delete the attachment itself
      this.attachments.delete(attachmentId);
    }
  }
}