import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupGoogleAuth, isAuthenticated, optionalAuth } from "./googleAuth";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { queryAI } from "./gemini";
import { aiLimiter, searchLimiter } from "./middleware/security.js";
import { 
  validateCreateConversation, 
  validateUpdateConversation,
  validateCreateMessage,
  validateSearch,
  validateUUIDParam,
  validateAIPrompt,
  sanitizePrompt
} from "./validators/index.js";
import { AppLogger } from "./utils/logger.js";

// AI integration with fallback for all providers
async function queryAIWithFallback(model: string, prompt: string, userId?: string) {
  const startTime = Date.now();
  try {
    // Sanitize prompt before sending to AI
    const sanitizedPrompt = sanitizePrompt(prompt);
    const response = await queryAI(model, sanitizedPrompt);
    
    const duration = Date.now() - startTime;
    AppLogger.ai({
      type: 'ai_response',
      model,
      userId,
      promptLength: sanitizedPrompt.length,
      responseLength: response.length,
      duration
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    AppLogger.ai({
      type: 'ai_error',
      model,
      userId,
      promptLength: prompt.length,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    AppLogger.error("AI API error", error);
    return generateFallbackResponse(prompt);
  }
}

// Fallback response generator for demonstration
function generateFallbackResponse(prompt: string): string {
  const responses = [
    "I understand your question. While I'm currently in demo mode, I can help you explore the features of this AI chat application. Try using the web search or YouTube search features!",
    "Thanks for your message! This application supports multiple AI models, web search integration, and conversation management. Feel free to test the different features available.",
    "I appreciate your input. This chat application demonstrates modern AI integration with features like model switching, search capabilities, and conversation history. What would you like to explore?",
    "Your message has been received. This application showcases how to integrate multiple AI models with web search and YouTube search capabilities. Try switching between different models!",
    "Thank you for trying out this AI chat application! While running in demo mode, you can still test features like creating new conversations, switching models, and using search integrations."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Google Custom Search API integration with enhanced logging
async function searchWeb(query: string, userId?: string) {
  const startTime = Date.now();
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    AppLogger.error("Google API credentials not configured");
    throw new Error("Search service temporarily unavailable");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`
    );

    if (!response.ok) {
      AppLogger.error(`Google Search API error: ${response.status} ${response.statusText}`);
      throw new Error(`Search service error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    })) || [];
    
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'google_search',
      details: { query, resultsCount: results.length, userId }
    });
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'google_search',
      details: { query, error: true, userId }
    });
    throw error;
  }
}

// YouTube Data API integration with enhanced logging
async function searchYouTube(query: string, userId?: string) {
  const startTime = Date.now();
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!API_KEY) {
    AppLogger.error("YouTube API key not configured");
    throw new Error("Video search service temporarily unavailable");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${API_KEY}`
    );

    if (!response.ok) {
      AppLogger.error(`YouTube API error: ${response.status} ${response.statusText}`);
      throw new Error(`Video search error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.items?.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    })) || [];
    
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'youtube_search',
      details: { query, resultsCount: results.length, userId }
    });
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'youtube_search',
      details: { query, error: true, userId }
    });
    throw error;
  }
}

// Google Custom Search API for Images with enhanced logging
async function searchImages(query: string, userId?: string) {
  const startTime = Date.now();
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    AppLogger.error("Google Image Search API credentials not configured");
    throw new Error("Image search service temporarily unavailable");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=10&imgSize=large`
    );

    if (!response.ok) {
      AppLogger.error(`Google Image Search API error: ${response.status} ${response.statusText}`);
      throw new Error(`Image search error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      thumbnail: item.image?.thumbnailLink || item.link,
      contextLink: item.image?.contextLink,
      displayLink: item.displayLink,
      width: item.image?.width,
      height: item.image?.height,
    })) || [];
    
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'image_search',
      details: { query, resultsCount: results.length, userId }
    });
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    AppLogger.performance({
      type: 'api_request',
      duration,
      endpoint: 'image_search',
      details: { query, error: true, userId }
    });
    throw error;
  }
}

// Temporary storage for demo messages
const demoMessages: Map<string, any[]> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupGoogleAuth(app);

  // Auth routes (keep this one with authentication required)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo mode - get current user (authenticated or demo)
  app.get('/api/user', optionalAuth, async (req: any, res) => {
    try {
      if (req.user.isDemo) {
        res.json(req.user);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const user = await storage.getUser(userId);
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.json(req.user); // Return demo user if DB fails
    }
  });

  // Conversation routes (now with optional auth)
  app.get('/api/conversations', optionalAuth, async (req: any, res: any) => {
    try {
      if (req.user.isDemo) {
        // Return demo conversations for non-authenticated users
        res.json([]);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversations = await storage.getUserConversations(userId);
        res.json(conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.json([]); // Return empty array for demo mode
    }
  });

  app.post('/api/conversations', optionalAuth, validateCreateConversation, async (req: any, res: any) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      
      if (req.user.isDemo) {
        // Create temporary conversation for demo mode
        const demoConversation = {
          id: `demo-${Date.now()}`,
          title: validatedData.title,
          userId: 'demo-user',
          model: validatedData.model,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        res.json(demoConversation);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversation = await storage.createConversation(userId, validatedData);
        res.json(conversation);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });

  app.get('/api/conversations/:id', optionalAuth, validateUUIDParam('id'), async (req: any, res: any) => {
    try {
      if (req.user.isDemo) {
        // Return demo conversation
        const demoConversation = {
          id: req.params.id,
          title: "Demo Conversation",
          userId: 'demo-user',
          model: 'gemini-pro',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        res.json(demoConversation);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversationId = req.params.id;
        const conversation = await storage.getConversation(conversationId, userId);
        
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        res.json(conversation);
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/conversations/:id', optionalAuth, validateUpdateConversation, async (req: any, res: any) => {
    try {
      if (req.user.isDemo) {
        // Demo mode - just return success
        res.json({ message: "Conversation updated successfully (demo mode)" });
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversationId = req.params.id;
        const { title } = req.body;
        
        if (!title) {
          return res.status(400).json({ message: "Title is required" });
        }
        
        await storage.updateConversationTitle(conversationId, userId, title);
        res.json({ message: "Conversation updated successfully" });
      }
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete('/api/conversations/:id', optionalAuth, validateUUIDParam('id'), async (req: any, res: any) => {
    try {
      if (req.user.isDemo) {
        // Demo mode - just return success
        res.json({ message: "Conversation deleted successfully (demo mode)" });
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversationId = req.params.id;
        await storage.deleteConversation(conversationId, userId);
        res.json({ message: "Conversation deleted successfully" });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:id/messages', optionalAuth, async (req: any, res) => {
    try {
      if (req.user.isDemo) {
        // Return demo messages from temporary storage
        const conversationId = req.params.id;
        const messages = demoMessages.get(conversationId) || [];
        res.json(messages);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversationId = req.params.id;
        const messages = await storage.getConversationMessages(conversationId, userId);
        res.json(messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', aiLimiter, optionalAuth, validateCreateMessage, async (req: any, res: any) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const conversationId = req.params.id;
      const { content, model, includeWebSearch, includeYouTubeSearch, includeImageSearch } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // For demo users, save messages to temporary storage
      if (req.user.isDemo) {
        const demoMessage = {
          id: `demo-msg-${Date.now()}`,
          conversationId,
          role: "user",
          content,
          createdAt: new Date(),
        };

        let enhancedPrompt = content;
        let searchResults: any = {};

        // Perform web search if requested (same logic as authenticated users)
        if (includeWebSearch) {
          try {
            const webResults = await searchWeb(content);
            searchResults.web = webResults;
            
            if (searchResults.web?.length > 0) {
              enhancedPrompt += `\n\nWeb search results:\n${searchResults.web
                .map((r: any) => `- ${r.title}: ${r.snippet}`)
                .join('\n')}`;
            }
          } catch (error) {
            console.error("Web search error:", error);
          }
        }

        // Perform YouTube search if requested (same logic as authenticated users)
        if (includeYouTubeSearch) {
          try {
            const youtubeResults = await searchYouTube(content);
            searchResults.youtube = youtubeResults;
            
            if (searchResults.youtube?.length > 0) {
              enhancedPrompt += `\n\nYouTube search results:\n${searchResults.youtube
                .map((r: any) => `- ${r.title}: ${r.description}`)
                .join('\n')}`;
            }
          } catch (error) {
            console.error("YouTube search error:", error);
          }
        }

        // Perform Image search if requested (same logic as authenticated users)
        if (includeImageSearch) {
          try {
            const imageResults = await searchImages(content);
            searchResults.images = imageResults;
            
            if (searchResults.images?.length > 0) {
              enhancedPrompt += `\n\nImage search results:\n${searchResults.images
                .map((r: any) => `- ${r.title} from ${r.displayLink}`)
                .join('\n')}`;
            }
          } catch (error) {
            console.error("Image search error:", error);
          }
        }

        // Get AI response with enhanced prompt - ensure we use Gemini as default
        const aiResponse = await queryAIWithFallback(model || "Gemini 2.5 Flash", enhancedPrompt);

        const demoAiMessage = {
          id: `demo-ai-msg-${Date.now()}`,
          conversationId,
          role: "assistant", 
          content: aiResponse,
          createdAt: new Date(),
          metadata: {
            model: model || "Gemini 2.5 Flash",
            searchResults,
            originalPrompt: content,
          },
        };

        // Save messages to temporary storage
        const existingMessages = demoMessages.get(conversationId) || [];
        existingMessages.push(demoMessage, demoAiMessage);
        demoMessages.set(conversationId, existingMessages);

        return res.json({
          userMessage: demoMessage,
          aiMessage: demoAiMessage,
          searchResults,
        });
      }

      // Verify conversation belongs to user (only for authenticated users)
      const conversation = await storage.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content,
      });

      let enhancedPrompt = content;
      let searchResults: any = {};

      // Perform web search if requested
      if (includeWebSearch) {
        try {
          const cached = await storage.getCachedSearchResults(content, "web");
          if (cached) {
            searchResults.web = cached.results;
          } else {
            const webResults = await searchWeb(content);
            searchResults.web = webResults;
            await storage.cacheSearchResults({
              query: content,
              type: "web",
              results: webResults,
            });
          }
          
          if (searchResults.web?.length > 0) {
            enhancedPrompt += `\n\nWeb search results:\n${searchResults.web
              .map((r: any) => `- ${r.title}: ${r.snippet}`)
              .join('\n')}`;
          }
        } catch (error) {
          console.error("Web search error:", error);
        }
      }

      // Perform YouTube search if requested
      if (includeYouTubeSearch) {
        try {
          const cached = await storage.getCachedSearchResults(content, "youtube");
          if (cached) {
            searchResults.youtube = cached.results;
          } else {
            const youtubeResults = await searchYouTube(content);
            searchResults.youtube = youtubeResults;
            await storage.cacheSearchResults({
              query: content,
              type: "youtube",
              results: youtubeResults,
            });
          }
          
          if (searchResults.youtube?.length > 0) {
            enhancedPrompt += `\n\nYouTube search results:\n${searchResults.youtube
              .map((r: any) => `- ${r.title}: ${r.description}`)
              .join('\n')}`;
          }
        } catch (error) {
          console.error("YouTube search error:", error);
        }
      }

      // Perform Image search if requested
      if (includeImageSearch) {
        try {
          const cached = await storage.getCachedSearchResults(content, "images");
          if (cached) {
            searchResults.images = cached.results;
          } else {
            const imageResults = await searchImages(content);
            searchResults.images = imageResults;
            await storage.cacheSearchResults({
              query: content,
              type: "images",
              results: imageResults,
            });
          }
          
          if (searchResults.images?.length > 0) {
            enhancedPrompt += `\n\nImage search results:\n${searchResults.images
              .map((r: any) => `- ${r.title} from ${r.displayLink}`)
              .join('\n')}`;
          }
        } catch (error) {
          console.error("Image search error:", error);
        }
      }

      // Get AI response - ensure we use Gemini as default
      const aiResponse = await queryAIWithFallback(model || conversation.model || "Gemini 2.5 Flash", enhancedPrompt);

      // Save AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse,
        metadata: {
          model: model || conversation.model,
          searchResults,
          originalPrompt: content,
        },
      });

      res.json({
        userMessage,
        aiMessage,
        searchResults,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Search routes
  app.post('/api/search/web', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const cached = await storage.getCachedSearchResults(query, "web");
      if (cached) {
        return res.json(cached.results);
      }

      const results = await searchWeb(query);
      await storage.cacheSearchResults({
        query,
        type: "web",
        results,
      });

      res.json(results);
    } catch (error) {
      console.error("Web search error:", error);
      res.status(500).json({ message: "Failed to perform web search" });
    }
  });

  app.post('/api/search/youtube', isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const cached = await storage.getCachedSearchResults(query, "youtube");
      if (cached) {
        return res.json(cached.results);
      }

      const results = await searchYouTube(query);
      await storage.cacheSearchResults({
        query,
        type: "youtube",
        results,
      });

      res.json(results);
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({ message: "Failed to perform YouTube search" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


