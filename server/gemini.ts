import { GoogleGenAI } from "@google/genai";
import { AppLogger } from './utils/logger.js';

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
        "Gemini 2.5 Flash": "gemini-2.5-flash",
        "Gemini 2.5 Pro": "gemini-2.5-pro", 
        "Gemini 1.5 Flash": "gemini-1.5-flash",
        "Gemini 1.5 Pro": "gemini-1.5-pro",
        "Gemini 1.0 Pro": "gemini-1.0-pro",
    };
    
    return modelMap[displayName] || "gemini-2.5-flash";
}

// Map display names to Mistral model names
export function getMistralModelName(displayName: string): string {
    const modelMap: Record<string, string> = {
        "Mistral Large": "mistral-large-latest",
        "Mistral 7B": "mistral-7b-instruct",
        "Mixtral 8x7B": "mixtral-8x7b-instruct",
        "Mixtral 8x22B": "mixtral-8x22b-instruct",
    };
    
    return modelMap[displayName] || "mistral-large-latest";
}

// Map display names to OpenRouter model names
export function getOpenRouterModelName(displayName: string): string {
    const modelMap: Record<string, string> = {
        "OpenRouter GPT-4o": "openai/gpt-4o",
        "OpenRouter Claude 3.5": "anthropic/claude-3.5-sonnet",
        "OpenRouter Llama 3.1 70B": "meta-llama/llama-3.1-70b-instruct",
        "OpenRouter Qwen 2.5 72B": "qwen/qwen-2.5-72b-instruct",
        "OpenRouter DeepSeek V3": "deepseek/deepseek-chat",
    };
    
    return modelMap[displayName] || "openai/gpt-4o";
}