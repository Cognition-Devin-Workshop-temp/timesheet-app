export interface KnowledgeArticle {
  id: string;
  title: string;
  source: "paste" | "upload";
  fileName?: string;
  createdAt: string;
  content?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: string[];
  template?: string;
  sources?: { articleId: string; articleTitle: string; excerpt: string }[];
  mode?: string;
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  steps: string[];
  template: string;
  sources: { articleId: string; articleTitle: string; excerpt: string }[];
  mode: string;
}
