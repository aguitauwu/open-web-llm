import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, demoStorage } from "./storage";
import { setupGoogleAuth, isAuthenticated, optionalAuth } from "./googleAuth";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { queryAI, analyzeFile, generateConversationTitle } from "./gemini";
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
import { fileService, FileService } from "./services/fileService.js";
import { 
  validateFileUpload, 
  validateFileQuery,
  validateUUIDParam as validateFileUUIDParam
} from "./validators/fileValidators.js";
import multer from "multer";
import { AppLogger } from "./utils/logger.js";

// AI integration with fallback for all providers
async function queryAIWithFallback(model: string, prompt: string, userId?: string, memoryContext?: string) {
  const startTime = Date.now();
  try {
    // Crear prompt del sistema para Stelluna con memoria
    const systemPrompt = `Eres Stelluna, una asistente de IA inteligente y amigable. Tu personalidad es:
- Cálida, empática y servicial
- Respondes con naturalidad y usando el nombre del usuario cuando lo conoces
- Tienes buena memoria y recuerdas información importante de conversaciones anteriores
- Cuando alguien te menciona por tu nombre "Stelluna", respondes con especial atención
- Eres experta en múltiples temas y puedes ayudar con tareas variadas
- Hablas de manera conversacional pero profesional

${memoryContext ? `Información que recuerdas sobre este usuario: ${memoryContext}` : ''}

Por favor responde de manera personalizada y útil.`;

    const enhancedPrompt = `${systemPrompt}\n\nUsuario: ${prompt}`;
    
    // Sanitize prompt before sending to AI
    const sanitizedPrompt = sanitizePrompt(enhancedPrompt);
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
  // Stelluna's fallback responses
  const responses = [
    "¡Hola! Soy Stelluna, tu asistente de IA. Aunque estoy en modo demo, puedo ayudarte a explorar las características de esta aplicación. ¡Prueba las funciones de búsqueda web o búsqueda de YouTube!",
    "Gracias por tu mensaje! Como Stelluna, puedo ayudarte con múltiples modelos de IA, integración de búsqueda web y gestión de conversaciones. ¡Explora las diferentes funciones disponibles!",
    "Soy Stelluna y aprecio tu mensaje. Esta aplicación demuestra cómo integrar múltiples modelos de IA con capacidades de búsqueda y historial de conversaciones. ¿Qué te gustaría explorar?",
    "Stelluna aquí! Tu mensaje ha sido recibido. Esta aplicación muestra cómo integrar múltiples modelos de IA con búsqueda web y capacidades de YouTube. ¡Prueba cambiando entre diferentes modelos!",
    "¡Hola! Soy Stelluna y me da gusto que pruebes esta aplicación de chat con IA. Aunque estoy en modo demo, puedes probar funciones como crear nuevas conversaciones, cambiar modelos y usar integraciones de búsqueda."
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
        // Return demo conversations from in-memory storage
        const demoConversations = demoStorage.getConversations();
        res.json(demoConversations);
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
        // Create and store conversation in demo storage
        const demoConversation = demoStorage.createConversation({
          title: validatedData.title,
          userId: 'demo-user',
          model: validatedData.model,
        });
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
        // Get demo conversation from storage
        const conversationId = req.params.id;
        const demoConversation = demoStorage.getConversation(conversationId);
        
        if (!demoConversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
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
        // Update conversation in demo storage
        const conversationId = req.params.id;
        const { title } = req.body;
        
        if (!title) {
          return res.status(400).json({ message: "Title is required" });
        }
        
        const updated = demoStorage.updateConversationTitle(conversationId, title);
        if (!updated) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        res.json({ message: "Conversation updated successfully" });
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
        // Delete conversation from demo storage
        const conversationId = req.params.id;
        const deleted = demoStorage.deleteConversation(conversationId);
        
        if (!deleted) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        res.json({ message: "Conversation deleted successfully" });
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
        // Return demo messages from demo storage
        const conversationId = req.params.id;
        const messages = demoStorage.getMessages(conversationId);
        console.log(`[DEBUG] Getting messages for demo conversation ${conversationId}, found ${messages.length} messages:`, messages);
        res.json(messages);
      } else {
        const userId = req.user.claims?.sub || req.user.id;
        const conversationId = req.params.id;
        const messages = await storage.getConversationMessages(conversationId, userId);
        console.log(`[DEBUG] Getting messages for authenticated user ${userId}, conversation ${conversationId}, found ${messages.length} messages`);
        res.json(messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', aiLimiter, optionalAuth, async (req: any, res: any) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const conversationId = req.params.id;
      const { content, model, includeWebSearch, includeYouTubeSearch, includeImageSearch, attachmentIds } = req.body;
      
      // Validación básica
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      if (content.trim().length === 0) {
        return res.status(400).json({ message: "Message content cannot be empty" });
      }
      
      if (content.length > 10000) {
        return res.status(400).json({ message: "Message content is too long" });
      }

      // For demo users, save messages to temporary storage
      if (req.user.isDemo) {
        const demoMessage = {
          id: `demo-msg-${Date.now()}`,
          conversationId,
          role: "user",
          content,
          metadata: null,
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

        // Process attached files using real analysis (even in demo mode)
        if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
          try {
            const fileAnalyses = [];
            for (const attachmentId of attachmentIds) {
              try {
                // Always try to get attachment from storage, regardless of demo mode
                const attachment = await storage.getAttachment(attachmentId, userId);
                
                if (attachment) {
                  // Check if analysis is already available in metadata
                  const metadata = attachment.metadata as any || {};
                  if (metadata.aiAnalysis && metadata.analysisStatus === 'completed') {
                    fileAnalyses.push(`📎 ${attachment.originalName}: ${metadata.aiAnalysis}`);
                  } else if (metadata.analysisStatus === 'pending') {
                    fileAnalyses.push(`📎 ${attachment.originalName}: [Analizando...] Este archivo está siendo procesado con IA.`);
                  } else if (metadata.analysisStatus === 'error') {
                    fileAnalyses.push(`📎 ${attachment.originalName}: Error al analizar el archivo. Archivo disponible pero sin análisis de IA.`);
                  } else {
                    // No analysis available, provide basic file info
                    fileAnalyses.push(`📎 ${attachment.originalName} (${attachment.mimeType}): Archivo disponible.`);
                  }
                } else {
                  fileAnalyses.push(`📎 Archivo ${attachmentId}: No encontrado o sin acceso.`);
                }
              } catch (attachmentError) {
                console.error(`Error processing attachment ${attachmentId}:`, attachmentError);
                fileAnalyses.push(`📎 Error procesando archivo ${attachmentId}.`);
              }
            }
            
            if (fileAnalyses.length > 0) {
              enhancedPrompt += `\n\nArchivos adjuntos:\n${fileAnalyses
                .map((analysis: string, index: number) => `${index + 1}. ${analysis}`)
                .join('\n')}`;
            }
          } catch (error) {
            console.error("File analysis error:", error);
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

        // Save messages to demo storage
        demoStorage.createMessage(demoMessage);
        demoStorage.createMessage(demoAiMessage);
        
        // Auto-generate conversation title asynchronously (non-blocking)
        setImmediate(async () => {
          try {
            const conversation = demoStorage.getConversation(conversationId);
            if (conversation && (conversation.title === 'New Chat' || conversation.title === 'Nueva conversación' || conversation.title === 'Nueva conversación')) {
              AppLogger.info("Generating automatic title for demo conversation", { conversationId, currentTitle: conversation.title });
              const generatedTitle = await generateConversationTitle(content);
              const updated = demoStorage.updateConversationTitle(conversationId, generatedTitle);
              if (updated) {
                AppLogger.info("Auto-generated conversation title", { conversationId, newTitle: generatedTitle });
              } else {
                AppLogger.warn("Failed to update conversation title in demo storage", { conversationId });
              }
            }
          } catch (error) {
            AppLogger.warn("Failed to auto-generate conversation title for demo user", error);
          }
        });

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

      // Process attached files if any (authenticated users)
      if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
        try {
          const fileAnalyses = [];
          for (const attachmentId of attachmentIds) {
            try {
              // Get the attachment from storage
              const attachment = await storage.getAttachment(attachmentId, userId);
              if (attachment) {
                // Check if analysis is already available in metadata
                const metadata = attachment.metadata as any || {};
                if (metadata.aiAnalysis && metadata.analysisStatus === 'completed') {
                  fileAnalyses.push(`📎 ${attachment.originalName}: ${metadata.aiAnalysis}`);
                } else if (metadata.analysisStatus === 'pending') {
                  fileAnalyses.push(`📎 ${attachment.originalName}: [Analizando...] Este archivo está siendo procesado con IA.`);
                } else if (metadata.analysisStatus === 'error') {
                  fileAnalyses.push(`📎 ${attachment.originalName}: Error al analizar el archivo. Archivo disponible pero sin análisis de IA.`);
                } else {
                  // No analysis available, provide basic file info
                  fileAnalyses.push(`📎 ${attachment.originalName} (${attachment.mimeType}, ${(attachment.size / 1024).toFixed(1)} KB): Archivo disponible.`);
                }
                
                // Link attachment to the user message
                try {
                  await storage.linkAttachmentToMessage(userMessage.id, attachmentId);
                } catch (linkError) {
                  console.warn('Failed to link attachment to message:', linkError);
                }
              } else {
                fileAnalyses.push(`📎 Archivo ${attachmentId}: No encontrado o sin acceso.`);
              }
            } catch (attachmentError) {
              console.error(`Error processing attachment ${attachmentId}:`, attachmentError);
              fileAnalyses.push(`📎 Error procesando archivo ${attachmentId}.`);
            }
          }
          
          if (fileAnalyses.length > 0) {
            enhancedPrompt += `\n\nArchivos adjuntos:\n${fileAnalyses
              .map((analysis: string, index: number) => `${index + 1}. ${analysis}`)
              .join('\n')}`;
          }
        } catch (error) {
          console.error("File analysis error:", error);
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

      // Auto-generate conversation title asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          if (conversation && (conversation.title === 'New Chat' || conversation.title === 'Nueva conversación' || conversation.title === 'Nueva conversación')) {
            AppLogger.info("Generating automatic title for authenticated conversation", { conversationId, userId, currentTitle: conversation.title });
            const generatedTitle = await generateConversationTitle(content);
            await storage.updateConversationTitle(conversationId, userId, generatedTitle);
            AppLogger.info("Auto-generated conversation title", { conversationId, userId, newTitle: generatedTitle });
          }
        } catch (error) {
          AppLogger.warn("Failed to auto-generate conversation title for authenticated user", error);
        }
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
  app.post('/api/search/web', searchLimiter, isAuthenticated, async (req: any, res) => {
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

  app.post('/api/search/youtube', searchLimiter, isAuthenticated, async (req: any, res) => {
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

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // File upload routes
  app.post('/api/files/upload', 
    optionalAuth, 
    upload.single('file'), 
    validateFileUpload, 
    async (req: any, res: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'demo-user';
        
        if (!req.file) {
          return res.status(400).json({ 
            error: 'No file provided',
            message: 'Please select a file to upload' 
          });
        }

        // Handle demo mode with real file upload but async analysis
        if (req.user?.isDemo) {
          // Use real file service for demo mode too - analysis happens asynchronously
          const result = await fileService.saveFile(req.file, userId);
          
          return res.json({
            success: true,
            attachment: result.attachment,
            url: result.url,
            message: 'File uploaded and being analyzed (demo mode)'
          });
        }

        const result = await fileService.saveFile(req.file, userId);
        
        // Optionally link to message if provided
        if (req.body.attachToMessage) {
          try {
            await storage.linkAttachmentToMessage(req.body.attachToMessage, result.attachment.id);
          } catch (error) {
            // File uploaded but linking failed - still return success
            console.warn('Failed to link attachment to message:', error);
          }
        }

        res.json({
          success: true,
          attachment: result.attachment,
          url: result.url,
          message: 'File uploaded successfully'
        });

      } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ 
          error: 'Upload failed',
          message: error instanceof Error ? error.message : 'Unknown upload error'
        });
      }
    }
  );

  // Get user files
  app.get('/api/files', 
    optionalAuth, 
    validateFileQuery, 
    async (req: any, res: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'demo-user';
        
        if (req.user?.isDemo) {
          // Return demo files
          return res.json([]);
        }

        const { limit = 20, offset = 0, type } = req.query;
        const attachments = await storage.getUserAttachments(userId, limit, offset);
        
        // Filter by type if specified
        let filteredAttachments = attachments;
        if (type && type !== 'all') {
          filteredAttachments = attachments.filter(attachment => {
            if (type === 'image') return FileService.isImageFile(attachment.mimeType);
            if (type === 'document') return FileService.isDocumentFile(attachment.mimeType);
            return true;
          });
        }

        res.json(filteredAttachments);
      } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ 
          error: 'Failed to fetch files',
          message: 'Unable to retrieve user files'
        });
      }
    }
  );

  // Get specific file
  app.get('/api/files/:id', 
    optionalAuth, 
    validateFileUUIDParam('id'), 
    async (req: any, res: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'demo-user';
        
        if (req.user?.isDemo) {
          return res.status(404).json({ error: 'File not found in demo mode' });
        }

        const { stream, attachment } = await fileService.getFileStream(req.params.id, userId);
        
        // Set appropriate headers
        res.set({
          'Content-Type': attachment.mimeType,
          'Content-Length': attachment.size.toString(),
          'Content-Disposition': `inline; filename="${attachment.originalName}"`,
        });

        stream.pipe(res);
      } catch (error) {
        console.error('Error serving file:', error);
        res.status(404).json({ 
          error: 'File not found',
          message: 'The requested file could not be found'
        });
      }
    }
  );

  // Delete file
  app.delete('/api/files/:id', 
    optionalAuth, 
    validateFileUUIDParam('id'), 
    async (req: any, res: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'demo-user';
        
        if (req.user?.isDemo) {
          return res.json({ message: 'File deleted successfully (demo mode)' });
        }

        await fileService.deleteFile(req.params.id, userId);
        res.json({ message: 'File deleted successfully' });
      } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ 
          error: 'Failed to delete file',
          message: error instanceof Error ? error.message : 'Unknown deletion error'
        });
      }
    }
  );

  // Get message attachments
  app.get('/api/messages/:id/attachments', 
    optionalAuth, 
    validateFileUUIDParam('id'), 
    async (req: any, res: any) => {
      try {
        const userId = req.user?.claims?.sub || req.user?.id || 'demo-user';
        
        if (req.user?.isDemo) {
          return res.json([]);
        }

        const attachments = await storage.getMessageAttachments(req.params.id, userId);
        res.json(attachments);
      } catch (error) {
        console.error('Error fetching message attachments:', error);
        res.status(500).json({ 
          error: 'Failed to fetch attachments',
          message: 'Unable to retrieve message attachments'
        });
      }
    }
  );

  // Google Services Routes
  const { googleServices } = await import('./googleServices.js');

  // Google Services validation schemas
  const googleDriveFolderSchema = z.object({
    folderName: z.string().min(1, "Folder name is required").max(100, "Folder name too long"),
  });

  const gmailSendSchema = z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
    body: z.string().min(1, "Message body is required").max(10000, "Message too long"),
  });

  const googleDocsCreateSchema = z.object({
    title: z.string().min(1, "Document title is required").max(100, "Title too long"),
    content: z.string().optional(),
  });

  const googleDocsUpdateSchema = z.object({
    text: z.string().min(1, "Text content is required"),
    insertIndex: z.number().int().min(1).optional(),
  });

  const googleDocsShareSchema = z.object({
    email: z.string().email("Invalid email address").optional(),
  });

  // Google Drive Routes
  app.get('/api/google/drive/files', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      googleServices.setCredentials(req.user.googleTokens);
      const files = await googleServices.listDriveFiles(10);
      
      res.json(files);
    } catch (error) {
      console.error('Error listing Drive files:', error);
      res.status(500).json({ message: 'Failed to list Drive files' });
    }
  });

  app.post('/api/google/drive/upload', optionalAuth, upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.uploadFileToDrive(
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      res.status(500).json({ message: 'Failed to upload to Drive' });
    }
  });

  app.post('/api/google/drive/folder', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const validatedData = googleDriveFolderSchema.parse(req.body);
      const { folderName } = validatedData;

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.createDriveFolder(folderName);
      
      res.json(result);
    } catch (error) {
      console.error('Error creating Drive folder:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid folder data", errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create Drive folder' });
      }
    }
  });

  // Gmail Routes
  app.get('/api/google/gmail/labels', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      googleServices.setCredentials(req.user.googleTokens);
      const labels = await googleServices.listGmailLabels();
      
      res.json(labels);
    } catch (error) {
      console.error('Error listing Gmail labels:', error);
      res.status(500).json({ message: 'Failed to list Gmail labels' });
    }
  });

  app.get('/api/google/gmail/messages', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      googleServices.setCredentials(req.user.googleTokens);
      const messages = await googleServices.listGmailMessages(10);
      
      res.json(messages);
    } catch (error) {
      console.error('Error listing Gmail messages:', error);
      res.status(500).json({ message: 'Failed to list Gmail messages' });
    }
  });

  app.post('/api/google/gmail/send', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const validatedData = gmailSendSchema.parse(req.body);
      const { to, subject, body } = validatedData;

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.sendGmailMessage(to, subject, body);
      
      res.json(result);
    } catch (error) {
      console.error('Error sending Gmail message:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email data", errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to send Gmail message' });
      }
    }
  });

  // Google Docs Routes
  app.post('/api/google/docs/create', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const validatedData = googleDocsCreateSchema.parse(req.body);
      const { title, content } = validatedData;

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.createGoogleDoc(title, content);
      
      res.json(result);
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid document data", errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create Google Doc' });
      }
    }
  });

  app.get('/api/google/docs/:documentId', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const { documentId } = req.params;
      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.readGoogleDoc(documentId);
      
      res.json(result);
    } catch (error) {
      console.error('Error reading Google Doc:', error);
      res.status(500).json({ message: 'Failed to read Google Doc' });
    }
  });

  app.patch('/api/google/docs/:documentId', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const { documentId } = req.params;
      const validatedData = googleDocsUpdateSchema.parse(req.body);
      const { text, insertIndex } = validatedData;

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.updateGoogleDoc(documentId, text, insertIndex);
      
      res.json(result);
    } catch (error) {
      console.error('Error updating Google Doc:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid update data", errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update Google Doc' });
      }
    }
  });

  app.post('/api/google/docs/:documentId/share', optionalAuth, async (req: any, res: any) => {
    try {
      if (!req.user?.googleTokens) {
        return res.status(401).json({ message: 'Google authentication required' });
      }

      const { documentId } = req.params;
      const validatedData = googleDocsShareSchema.parse(req.body);
      const { email } = validatedData;

      googleServices.setCredentials(req.user.googleTokens);
      const result = await googleServices.shareGoogleDoc(documentId, email);
      
      res.json(result);
    } catch (error) {
      console.error('Error sharing Google Doc:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid sharing data", errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to share Google Doc' });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


