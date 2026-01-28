
import { GoogleGenAI } from "@google/genai";
import { Message, Role } from "../types";

const PROXY_URL = "https://gemini-server-nova-ai07.onrender.com";

export interface StreamResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

/**
 * Strategy 1: Direct SDK Connection (High-Performance Gemini 3 Pro)
 */
async function streamDirect(messages: Message[], onChunk: (data: StreamResponse) => void) {
  if (!process.env.API_KEY) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents = messages.map(m => ({
    role: m.role === Role.USER ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: contents,
    config: {
      systemInstruction: "You are NOVA, a world-class AI assistant. Use professional tone and Markdown. If asked about current news, use search.",
      thinkingConfig: { thinkingBudget: 4000 },
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

/**
 * Strategy 2: Proxy Fallback (Bypass ISP/Hosting Blocks)
 */
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

  if (!response.ok) throw new Error("Proxy server unresponsive.");
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkText = decoder.decode(value);
    accumulated += chunkText.replace(/^data:\s*/, '').trim();
    onChunk({ text: accumulated });
  }
}

export const streamChatResponse = async (
  messages: Message[],
  onChunk: (data: StreamResponse) => void,
  onProtocolChange?: (protocol: 'direct' | 'proxy') => void
): Promise<void> => {
  try {
    if (onProtocolChange) onProtocolChange('direct');
    await streamDirect(messages, onChunk);
  } catch (error) {
    console.warn("Direct access failed. Falling back to proxy...");
    try {
      if (onProtocolChange) onProtocolChange('proxy');
      await streamViaProxy(messages, onChunk);
    } catch (proxyError) {
      throw new Error("সবগুলো কানেকশন মেথড ব্লক করা হয়েছে। দয়া করে ভিপিএন ব্যবহার করুন বা হোস্টিং প্রোভাইডারের সাথে কথা বলুন।");
    }
  }
};
