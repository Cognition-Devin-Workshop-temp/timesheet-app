import axios from "axios";
import type { KnowledgeArticle, ChatResponse, ChatMessage } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

export async function listArticles(): Promise<KnowledgeArticle[]> {
  const { data } = await api.get<{ articles: KnowledgeArticle[] }>(
    "/api/knowledge"
  );
  return data.articles;
}

export async function getArticle(id: string): Promise<KnowledgeArticle> {
  const { data } = await api.get<{ article: KnowledgeArticle }>(
    `/api/knowledge/${id}`
  );
  return data.article;
}

export async function addArticleText(
  title: string,
  content: string
): Promise<KnowledgeArticle> {
  const { data } = await api.post<{ article: KnowledgeArticle }>(
    "/api/knowledge/text",
    { title, content }
  );
  return data.article;
}

export async function uploadArticleFile(
  file: File,
  title?: string
): Promise<KnowledgeArticle> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const { data } = await api.post<{ article: KnowledgeArticle }>(
    "/api/knowledge/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.article;
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/api/knowledge/${id}`);
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[]
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/api/chat", {
    message,
    conversationHistory: conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
  return data;
}

export async function checkHealth(): Promise<{
  status: string;
  mode: string;
}> {
  const { data } = await api.get("/health");
  return data;
}
