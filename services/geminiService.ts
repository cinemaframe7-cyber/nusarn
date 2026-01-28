
import { GoogleGenAI } from "@google/genai";
import { Message, Role } from "../types";

const PROXY_URL = "https://gemini-server-nova-ai07.onrender.com";

export interface StreamResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

const getSafeApiKey = (): string | null => {
  try {
    const env = (import.meta as any).env;
    // Check both process (for local dev/certain hosts) and import.meta.env (for Vite production)
    const key = (typeof process !== 'undefined' && process.env?.API_KEY) || env?.VITE_GEMINI_KEY;
    if (!key || key === 'undefined' || key.includes("YOUR_API_KEY")) return null;
    return key;
  } catch (e) {
    console.warn("Environment variable access failed, app will proceed without direct key.");
    return null;
  }
};

async function streamDirect(messages: Message[], onChunk: (data: StreamResponse) => void) {
  const apiKey = getSafeApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map(m => ({
    role: m.role === Role.USER ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: contents,
    config: {
      systemInstruction: "You are NOVA, a world-class AI. Keep responses concise and professional. Use Markdown.",
      thinkingConfig: { thinkingBudget: 32768 },
      tools: [{ googleSearch: {} }]
    }
  });

  let accumulatedText = "";
  for await (const chunk of responseStream) {
    if (chunk.text) {
      accumulatedText += chunk.text;
      const sources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(c => c.web)
        .map(c => ({ title: c.web!.title, uri: c.web!.uri }));

      onChunk({ text: accumulatedText, sources });
    }
  }
}

async function streamViaProxy(messages: Message[], onChunk: (data: StreamResponse) => void) {
  const contents = messages.map(m => ({
    role: m.role === Role.USER ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) throw new Error("PROXY_OFFLINE");
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  if (!reader) throw new Error("EMPTY_BODY");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkText = decoder.decode(value);
    const cleanChunk = chunkText.replace(/^data:\s*/, '').trim();
    if (cleanChunk) {
      accumulated += cleanChunk;
      onChunk({ text: accumulated });
    }
  }
}

export const streamChatResponse = async (
  messages: Message[],
  onChunk: (data: StreamResponse) => void,
  onProtocolChange?: (protocol: 'direct' | 'proxy') => void
): Promise<void> => {
  const apiKey = getSafeApiKey();

  if (apiKey) {
    try {
      if (onProtocolChange) onProtocolChange('direct');
      await streamDirect(messages, onChunk);
      return;
    } catch (error: any) {
      console.warn("Direct connection failed, attempting proxy fallback...", error);
    }
  }

  try {
    if (onProtocolChange) onProtocolChange('proxy');
    await streamViaProxy(messages, onChunk);
  } catch (proxyError: any) {
    throw new Error(proxyError.message === "PROXY_OFFLINE" 
      ? "সার্ভারটি বর্তমানে অফলাইন। পরে চেষ্টা করুন।" 
      : "সবগুলো কানেকশন মেথড ব্যর্থ হয়েছে।");
  }
};
