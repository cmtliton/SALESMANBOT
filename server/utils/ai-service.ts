// server/utils/ai-service.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq"; // Groq প্রোভাইডার
import { createOllama } from "ollama-ai-provider-v2"; // লোকাল ডেভেলপমেন্ট টেস্টিংয়ের জন্য
import type { LanguageModel } from "ai";

/**
 * ১. ডাইনামিক ল্যাঙ্গুয়েজ মডেল ফ্যাক্টরি (Dynamic LLM Provider Switcher)
 * ডাটাবেস সেটিংস বা কাস্টমারের চয়েস অনুযায়ী সঠিক মডেলটি রিটার্ন করবে।
 */
export function getLanguageModel(
  provider: string,
  modelName?: string,
  customApiKey?: string | null,
  customBaseUrl?: string | null,
): LanguageModel {
  const providerKey = provider.toUpperCase();

  switch (providerKey) {
    case "OLLAMA":
    case "DEVELOPMENT": {
      // লোকাল টেস্টিংয়ের জন্য ডিফল্ট
      const ollamaInstance = createOllama({
        baseURL: process.env.OLLAMA_HOST || "http://127.0.0.1:11434/api",
      });
      return ollamaInstance(modelName || "llama3.2");
    }

    case "OPENAI": {
      const openaiInstance = createOpenAI({
        apiKey: customApiKey || process.env.OPENAI_API_KEY,
      });
      return openaiInstance(modelName || "gpt-4o-mini");
    }

    case "GEMINI":
    case "GOOGLE": {
      const googleInstance = createGoogleGenerativeAI({
        apiKey: customApiKey || process.env.GEMINI_API_KEY,
      });
      return googleInstance(modelName || "gemini-1.5-flash");
    }

    case "CLAUDE":
    case "ANTHROPIC": {
      const anthropicInstance = createAnthropic({
        apiKey: customApiKey || process.env.ANTHROPIC_API_KEY,
      });
      return anthropicInstance(modelName || "claude-3-5-sonnet-20241022");
    }

    case "MISTRAL": {
      const mistralInstance = createMistral({
        apiKey: customApiKey || process.env.MISTRAL_API_KEY,
      });
      return mistralInstance(modelName || "mistral-large-latest");
    }

    case "GROQ": {
      // সুপার-ফাস্ট Groq এপিআই
      const groqInstance = createGroq({
        apiKey: customApiKey || process.env.GROQ_API_KEY,
      });
      return groqInstance(modelName || "llama-3.3-70b-versatile");
    }

    case "OPENROUTER": {
      // OpenRouter মূলত OpenAI-এর স্ট্রাকচার ফলো করে, তাই createOpenAI দিয়ে এটি ডাইনামিকালি হ্যান্ডেল করা যায়
      const openRouterInstance = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: customApiKey || process.env.OPENROUTER_API_KEY,
      });
      return openRouterInstance(
        modelName || "meta-llama/llama-3.3-70b-instruct",
      );
    }

    case "CUSTOM": {
      // কাস্টম প্রোভাইডারের জন্য ওপেনএআই সামঞ্জস্যপূর্ণ এপিআই বা বেস ইউআরএল হ্যান্ডেল করবে
      if (!customBaseUrl) {
        throw new Error("Custom provider requires a valid Base URL");
      }
      const customInstance = createOpenAI({
        baseURL: customBaseUrl,
        apiKey: customApiKey || "",
      });
      return customInstance(modelName || "custom-model");
    }

    default: {
      // সিস্টেম ডিফল্ট মডেল (লগইন করা ইউজার বা ডাইনামিক ফলব্যাক)
      const defaultOpenai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return defaultOpenai("gpt-4o-mini");
    }
  }
}

/**
 * ২. ডাইনামিক এম্বেডিং মডেল ফ্যাক্টরি (Dynamic Embedding Provider)
 * pgvector (768) ডাইমেনশন কনস্ট্রেইন্ট বজায় রেখে এম্বেডিং জেনারেট করে
 */
export const getEmbeddingModel = (provider: string, customApiKey?: string) => {
  const normProvider = provider.toUpperCase();

  if (normProvider === "OPENAI") {
    return openaiEmbeddingHelper(customApiKey);
  }

  // ডিফল্ট ডেভেলপমেন্ট এবং প্রোডাকশন চয়েস হিসেবে Gemini-এর এম্বেডিং মডেল
  return geminiEmbeddingHelper(customApiKey);
};

// ওল্লামা এম্বেডিং মডেল জেনারেটর (৭৬৮ ডাইমেনশন)
export function getOllamaEmbeddingModel(modelName?: string) {
  const ollama = createOllama({
    baseURL: process.env.OLLAMA_HOST || "http://127.0.0.1:11434/api",
  });
  return ollama.embeddingModel(modelName || "nomic-embed-text");
}

// ==========================================
// ৩. ইন্টারনাল হেল্পার ফাংশনসমূহ (ডাইমেনশন ম্যাপার)
// ==========================================

function openaiEmbeddingHelper(apiKey?: string) {
  const openai = createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
  // OpenAI-এর text-embedding-3-small মডেলকে ডাটাবেসের কনস্ট্রেইন্ট অনুযায়ী ৭৬৮ ডাইমেনশনে রেস্ট্রিক্ট করা হলো
  return openai.embeddingModel("text-embedding-3-small");
}

function geminiEmbeddingHelper(apiKey?: string) {
  const google = createGoogleGenerativeAI({
    apiKey: apiKey || process.env.GEMINI_API_KEY,
  });
  return google.embeddingModel("text-embedding-004"); // Gemini-র ডিফল্ট ডাইমেনশন ৭৬৮
}
