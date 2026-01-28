
import { GoogleGenAI } from "@google/genai";
import { Message, Role } from "../types";

// আপনার দেওয়া রেন্ডার প্রক্সি ইউআরএল
const PROXY_URL = "https://gemini-server-nova-ai07.onrender.com";

export interface StreamResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

/**
 * Strategy 1: Direct SDK Connection
 * রেন্ডারের এনভায়রনমেন্টে API_KEY থাকলে এটি কাজ করবে
 */
async function streamDirect(messages: Message[], onChunk: (data: StreamResponse) => void) {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.includes("YOUR_API_KEY")) {
    throw new Error("Local API Key not found. Switching to Proxy...");
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map(m => ({
    role: m.role === Role.USER ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: contents,
    config: {
      systemInstruction: "You are NOVA, a highly intelligent AI. Always respond in a helpful manner. Use Markdown.",
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
 * Strategy 2: Proxy Relaying
 * এপিআই কী না থাকলে বা ব্লকড হলে এটি ব্যবহার হবে
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

  if (!response.ok) throw new Error("প্রক্সি সার্ভারটি বর্তমানে অফলাইন আছে।");
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  if (!reader) throw new Error("Response body is empty");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkText = decoder.decode(value);
    // প্রক্সি সার্ভারের ডেটা ফরম্যাট অনুযায়ী ক্লিনিং
    const cleanChunk = chunkText.replace(/^data:\s*/, '').trim();
    if (cleanChunk) {
      accumulated += cleanChunk;
      onChunk({ text: accumulated });
    }
  }
}

/**
 * Main Logic: অটোমেটিক মেথড সিলেকশন
 */
export const streamChatResponse = async (
  messages: Message[],
  onChunk: (data: StreamResponse) => void,
  onProtocolChange?: (protocol: 'direct' | 'proxy') => void
): Promise<void> => {
  
  // চেক করা হচ্ছে API_KEY এনভায়রনমেন্টে আছে কি না
  const hasKey = process.env.API_KEY && !process.env.API_KEY.includes("YOUR_API_KEY");

  if (hasKey) {
    try {
      if (onProtocolChange) onProtocolChange('direct');
      await streamDirect(messages, onChunk);
      return; // সাকসেস হলে এখানেই শেষ
    } catch (error) {
      console.warn("Direct Connection failed, trying Proxy...", error);
    }
  }

  // কী না থাকলে বা ডাইরেক্ট ফেইল করলে প্রক্সিতে যাবে
  try {
    if (onProtocolChange) onProtocolChange('proxy');
    await streamViaProxy(messages, onChunk);
  } catch (proxyError: any) {
    throw new Error(proxyError.message || "সবগুলো কানেকশন মেথড ব্যর্থ হয়েছে।");
  }
};
