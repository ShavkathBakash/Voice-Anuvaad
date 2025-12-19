
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function translateText(text: string, sourceLang: string, targetLang: string) {
  if (!text.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translated text, no other conversation.\n\nText: "${text}"`,
      config: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    return response.text || "Translation error";
  } catch (error) {
    console.error("Translation service error:", error);
    throw error;
  }
}

export async function detectLanguage(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the ISO language code for the following text: "${text}". Reply ONLY with the 2-letter code (e.g. "en").`,
    });
    return response.text?.trim().toLowerCase() || "en";
  } catch (error) {
    return "en";
  }
}
