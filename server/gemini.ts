import { GoogleGenAI } from "@google/genai";
import { AppLogger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
if (!process.env.GEMINI_API_KEY) {
  AppLogger.warn("Gemini API key not provided. Gemini AI models will not be available", { 
    missing: 'GEMINI_API_KEY',
    suggestion: 'Get your API key from https://aistudio.google.com/app/apikey and set GEMINI_API_KEY environment variable'
  });
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Mistral API integration
async function queryMistralAPI(model: string, prompt: string): Promise<string> {
    try {
        const API_KEY = process.env.MISTRAL_API_KEY;
        if (!API_KEY) {
            throw new Error("Mistral API key not found");
        }

        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Mistral API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        AppLogger.error("Mistral API error", error);
        throw new Error(`Mistral API request failed: ${errorMessage}`);
    }
}

// OpenRouter API integration
async function queryOpenRouterAPI(model: string, prompt: string): Promise<string> {
    try {
        const API_KEY = process.env.OPENROUTER_API_KEY;
        if (!API_KEY) {
            throw new Error("OpenRouter API key not found");
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://localhost:5000",
                "X-Title": "AI Chat Assistant",
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        AppLogger.error("OpenRouter API error", error);
        throw new Error(`OpenRouter API request failed: ${errorMessage}`);
    }
}

export async function generateChatResponse(prompt: string, model: string = "gemini-2.5-flash"): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        if (!response || !response.text) {
            throw new Error("Invalid response from Gemini API");
        }
        return response.text;
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}

export async function generateChatResponseWithContext(messages: Array<{role: string, content: string}>, model: string = "gemini-2.5-flash"): Promise<string> {
    try {
        // Convert messages to Gemini format
        const contents = messages.map(msg => {
            const role = msg.role === "assistant" ? "model" : "user";
            return {
                role,
                parts: [{ text: msg.content }]
            };
        });

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });

        if (!response || !response.text) {
            throw new Error("Invalid response from Gemini API");
        }
        return response.text;
    } catch (error) {
        console.error("Gemini API error:", error);
        throw error;
    }
}

// Unified AI query function that routes to the appropriate API
export async function queryAI(model: string, prompt: string): Promise<string> {
    try {
        if (model.startsWith("Gemini")) {
            const geminiModel = getGeminiModelName(model);
            return await generateChatResponse(prompt, geminiModel);
        } else if (model.startsWith("Mistral")) {
            const mistralModel = getMistralModelName(model);
            return await queryMistralAPI(mistralModel, prompt);
        } else if (model.startsWith("OpenRouter")) {
            const openRouterModel = getOpenRouterModelName(model);
            return await queryOpenRouterAPI(openRouterModel, prompt);
        } else {
            // Default to Gemini for any unrecognized model
            return await generateChatResponse(prompt, "gemini-2.5-flash");
        }
    } catch (error) {
        console.error("AI query error:", error);
        throw error;
    }
}

// Map display names to Gemini model names
export function getGeminiModelName(displayName: string): string {
    const modelMap: Record<string, string> = {
        "Gemini 2.0 Flash": "gemini-2.0-flash-exp",
        "Gemini 2.5 Flash": "gemini-2.5-flash",
        "Gemini 2.5 Pro": "gemini-2.5-pro", 
        "Gemini 1.5 Flash": "gemini-1.5-flash",
        "Gemini 1.5 Pro": "gemini-1.5-pro",
    };
    
    return modelMap[displayName] || "gemini-2.5-flash";
}

// Map display names to Mistral model names
export function getMistralModelName(displayName: string): string {
    const modelMap: Record<string, string> = {
        "Mistral Large 2": "mistral-large-latest",
        "Mistral Small": "mistral-small-latest",
        "Mistral Nemo": "open-mistral-nemo-2407",
        "Mixtral 8x7B": "mixtral-8x7b-instruct",
        "Mixtral 8x22B": "mixtral-8x22b-instruct",
    };
    
    return modelMap[displayName] || "mistral-large-latest";
}

// Map display names to OpenRouter model names
export function getOpenRouterModelName(displayName: string): string {
    const modelMap: Record<string, string> = {
        "OpenRouter GPT-4o": "openai/gpt-4o",
        "OpenRouter GPT-4o Mini": "openai/gpt-4o-mini",
        "OpenRouter Claude 3.5 Sonnet": "anthropic/claude-3.5-sonnet",
        "OpenRouter Claude 3.5 Haiku": "anthropic/claude-3.5-haiku",
        "OpenRouter Llama 3.3 70B": "meta-llama/llama-3.3-70b-instruct",
        "OpenRouter Qwen 2.5 72B": "qwen/qwen-2.5-72b-instruct",
        "OpenRouter DeepSeek V3": "deepseek/deepseek-v3",
        "OpenRouter Grok Beta": "x-ai/grok-beta",
    };
    
    return modelMap[displayName] || "openai/gpt-4o";
}

// Análisis de imágenes con Gemini
export async function analyzeImage(imagePath: string, prompt: string = "Describe what you see in this image in detail."): Promise<string> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key not configured");
        }

        // Verificar que el archivo existe
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        // Leer la imagen y convertirla a base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Determinar el tipo MIME basado en la extensión
        const extension = path.extname(imagePath).toLowerCase();
        const mimeTypeMap: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        };
        const mimeType = mimeTypeMap[extension] || 'image/jpeg';

        // Enviar a Gemini para análisis
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        });

        if (!response || !response.text) {
            throw new Error("Invalid response from Gemini API");
        }

        AppLogger.info("Image analyzed successfully", {
            imagePath: path.basename(imagePath),
            mimeType,
            responseLength: response.text.length
        });

        return response.text;
    } catch (error) {
        AppLogger.error("Image analysis error", error);
        throw error;
    }
}

// Análisis de documentos de texto
export async function analyzeTextFile(filePath: string, prompt: string = "Summarize the content of this document."): Promise<string> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key not configured");
        }

        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Leer el contenido del archivo
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Crear el prompt completo
        const fullPrompt = `${prompt}\n\nContent of the file:\n---\n${content}\n---`;

        // Usar la función existente para generar respuesta
        const response = await generateChatResponse(fullPrompt, "gemini-2.5-flash");

        AppLogger.info("Text file analyzed successfully", {
            filePath: path.basename(filePath),
            contentLength: content.length,
            responseLength: response.length
        });

        return response;
    } catch (error) {
        AppLogger.error("Text file analysis error", error);
        throw error;
    }
}

// Función unificada para analizar cualquier tipo de archivo
export async function analyzeFile(filePath: string, mimeType: string, customPrompt?: string): Promise<string> {
    try {
        // Verificar que las API keys estén disponibles antes de intentar análisis
        if (!process.env.GEMINI_API_KEY && !process.env.MISTRAL_API_KEY && !process.env.OPENROUTER_API_KEY) {
            return `Archivo ${path.basename(filePath)} subido correctamente. El análisis de IA no está disponible (claves API no configuradas).`;
        }

        // Determinar el tipo de análisis basado en el MIME type
        if (mimeType.startsWith('image/')) {
            const prompt = customPrompt || "Describe this image in detail. If there's text in the image, extract and transcribe it. If it's a diagram, chart, or infographic, explain its content and meaning.";
            return await analyzeImage(filePath, prompt);
        } else if (
            mimeType === 'text/plain' || 
            mimeType === 'text/markdown' || 
            mimeType === 'application/json' ||
            mimeType.startsWith('text/')
        ) {
            const prompt = customPrompt || "Analyze and summarize this document. Extract key points, main topics, and provide insights about the content.";
            return await analyzeTextFile(filePath, prompt);
        } else {
            // Para otros tipos de archivos, proporcionar información básica
            return `Este archivo es de tipo ${mimeType}. El análisis automático de este tipo de archivo no está disponible, pero el archivo ha sido subido correctamente y está disponible para descargar.`;
        }
    } catch (error) {
        AppLogger.error("File analysis error", { filePath: path.basename(filePath), mimeType, error: error instanceof Error ? error.message : 'Unknown error' });
        
        // Proporcionar mensaje más específico basado en el tipo de error
        if (error instanceof Error) {
            if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
                return `Archivo ${path.basename(filePath)} subido correctamente. Análisis de IA temporalmente no disponible (error de conectividad).`;
            } else if (error.message.includes('API key') || error.message.includes('Authentication')) {
                return `Archivo ${path.basename(filePath)} subido correctamente. Análisis de IA no disponible (error de autenticación).`;
            }
        }
        
        return `Archivo ${path.basename(filePath)} subido correctamente. El análisis automático no pudo completarse, pero el archivo está disponible.`;
    }
}