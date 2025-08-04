import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChatResponse(prompt: string, model: string = "gemini-2.5-flash"): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || "I apologize, but I couldn't generate a response at the moment.";
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

        return response.text || "I apologize, but I couldn't generate a response at the moment.";
    } catch (error) {
        console.error("Gemini API error:", error);
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