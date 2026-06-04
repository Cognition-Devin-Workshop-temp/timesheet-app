export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  source: "paste" | "upload";
  fileName?: string;
  createdAt: string;
  chunks: ArticleChunk[];
}

export interface ArticleChunk {
  id: string;
  articleId: string;
  content: string;
  index: number;
  terms: Record<string, number>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: string[];
  template?: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  steps: string[];
  template: string;
  sources: { articleId: string; articleTitle: string; excerpt: string }[];
  mode: "demo" | "gemini" | "openai";
}

export interface LLMProvider {
  generateResponse(
    query: string,
    context: string[],
    conversationHistory: ChatMessage[]
  ): Promise<{ answer: string; steps: string[]; template: string }>;
}

export interface SearchResult {
  chunk: ArticleChunk;
  score: number;
  articleTitle: string;
  articleId: string;
}
