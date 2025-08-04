import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

// Hugging Face API integration
async function queryHuggingFace(model: string, prompt: string) {
  const API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  if (!API_KEY) {
    throw new Error("Hugging Face API key not found");
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result[0]?.generated_text || "Sorry, I couldn't generate a response.";
}

// Google Custom Search API integration
async function searchWeb(query: string) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!API_KEY || !SEARCH_ENGINE_ID) {
    throw new Error("Google API credentials not found");
  }

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`
  );

  if (!response.ok) {
    throw new Error(`Google Search API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items?.map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  })) || [];
}

// YouTube Data API integration
async function searchYouTube(query: string) {
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!API_KEY) {
    throw new Error("YouTube API key not found");
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items?.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  })) || [];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(userId, validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      const conversation = await storage.getConversation(conversationId, userId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.patch('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      await storage.updateConversationTitle(conversationId, userId, title);
      res.json({ message: "Conversation updated successfully" });
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      await storage.deleteConversation(conversationId, userId);
      res.json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      const messages = await storage.getConversationMessages(conversationId, userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = req.params.id;
      const { content, model, includeWebSearch, includeYouTubeSearch } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify conversation belongs to user
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

      // Get AI response
      const modelName = getHuggingFaceModelName(model || conversation.model);
      const aiResponse = await queryHuggingFace(modelName, enhancedPrompt);

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

// Helper function to map display names to Hugging Face model names
function getHuggingFaceModelName(displayName: string): string {
  const modelMap: Record<string, string> = {
    "Llama 3.1 70B (Reasoning)": "meta-llama/Llama-3.1-70b-chat-hf",
    "Gemma 2 27B": "google/gemma-2-27b-it",
    "Mistral 7B Instruct": "mistralai/Mistral-7B-Instruct-v0.3",
    "DeepSeek Coder 33B": "deepseek-ai/deepseek-coder-33b-instruct",
    "CodeLlama 34B": "codellama/CodeLlama-34b-Instruct-hf",
    "Mixtral 8x7B": "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "Qwen2 72B": "Qwen/Qwen2-72B-Instruct",
    "StarCoder 15B": "bigcode/starcoder",
    "Falcon 40B": "tiiuae/falcon-40b-instruct",
    "Claude 3 Haiku": "anthropic/claude-3-haiku-20240307",
  };
  
  return modelMap[displayName] || "meta-llama/Llama-3.1-70b-chat-hf";
}
