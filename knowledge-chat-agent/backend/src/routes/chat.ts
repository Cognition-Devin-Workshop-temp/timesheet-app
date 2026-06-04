import { Router, Request, Response } from "express";
import { searchKnowledge } from "../services/search";
import { createLLMProvider } from "../services/llm";
import type { ChatRequest, ChatResponse } from "../types";

const router = Router();
const { provider, mode } = createLLMProvider();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [] }: ChatRequest = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const searchResults = searchKnowledge(message, 5);

    const contextChunks = searchResults.map((r) => r.chunk.content);

    const { answer, steps, template } = await provider.generateResponse(
      message,
      contextChunks,
      conversationHistory
    );

    const sources = searchResults.slice(0, 3).map((r) => ({
      articleId: r.articleId,
      articleTitle: r.articleTitle,
      excerpt: r.chunk.content.substring(0, 150) + "...",
    }));

    const response: ChatResponse = {
      answer,
      steps,
      template,
      sources,
      mode: mode as ChatResponse["mode"],
    };

    res.json(response);
  } catch (err) {
    console.error("Chat error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate response";
    res.status(500).json({ error: message });
  }
});

export default router;
