import type { LLMProvider } from "../../types";
import { MockLLMProvider } from "./mock";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

export function createLLMProvider(): { provider: LLMProvider; mode: string } {
  const llmProvider = process.env.LLM_PROVIDER || "demo";

  switch (llmProvider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn(
          "GEMINI_API_KEY not set, falling back to demo mode."
        );
        return { provider: new MockLLMProvider(), mode: "demo" };
      }
      console.log("Using Gemini LLM provider.");
      return { provider: new GeminiProvider(apiKey), mode: "gemini" };
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn(
          "OPENAI_API_KEY not set, falling back to demo mode."
        );
        return { provider: new MockLLMProvider(), mode: "demo" };
      }
      console.log("Using OpenAI LLM provider.");
      return { provider: new OpenAIProvider(apiKey), mode: "openai" };
    }
    default:
      console.log("Running in demo mode (no LLM API key required).");
      return { provider: new MockLLMProvider(), mode: "demo" };
  }
}
