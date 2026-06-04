import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import type { KnowledgeArticle, ArticleChunk } from "../types";

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "articles.json");

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeTermFrequency(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  const total = tokens.length || 1;
  for (const key of Object.keys(tf)) {
    tf[key] = tf[key] / total;
  }
  return tf;
}

function chunkText(text: string, articleId: string): ArticleChunk[] {
  const words = text.split(/\s+/);
  const chunks: ArticleChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunkContent = words.slice(start, end).join(" ");
    const tokens = tokenize(chunkContent);

    chunks.push({
      id: uuidv4(),
      articleId,
      content: chunkContent,
      index,
      terms: computeTermFrequency(tokens),
    });

    start += CHUNK_SIZE - CHUNK_OVERLAP;
    index++;
  }

  return chunks;
}

class KnowledgeStore {
  private articles: Map<string, KnowledgeArticle> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
        for (const article of data) {
          this.articles.set(article.id, article);
        }
      }
    } catch {
      console.log("No existing data found, starting fresh.");
    }
  }

  private save(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = Array.from(this.articles.values());
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
  }

  addArticle(
    title: string,
    content: string,
    source: "paste" | "upload",
    fileName?: string
  ): KnowledgeArticle {
    const id = uuidv4();
    const chunks = chunkText(content, id);

    const article: KnowledgeArticle = {
      id,
      title,
      content,
      source,
      fileName,
      createdAt: new Date().toISOString(),
      chunks,
    };

    this.articles.set(id, article);
    this.save();
    return article;
  }

  removeArticle(id: string): boolean {
    const deleted = this.articles.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  getArticle(id: string): KnowledgeArticle | undefined {
    return this.articles.get(id);
  }

  listArticles(): Omit<KnowledgeArticle, "chunks" | "content">[] {
    return Array.from(this.articles.values()).map(
      ({ id, title, source, fileName, createdAt }) => ({
        id,
        title,
        source,
        fileName,
        createdAt,
      })
    );
  }

  getAllChunks(): {
    chunk: ArticleChunk;
    articleTitle: string;
    articleId: string;
  }[] {
    const result: {
      chunk: ArticleChunk;
      articleTitle: string;
      articleId: string;
    }[] = [];
    for (const article of this.articles.values()) {
      for (const chunk of article.chunks) {
        result.push({
          chunk,
          articleTitle: article.title,
          articleId: article.id,
        });
      }
    }
    return result;
  }

  getArticleCount(): number {
    return this.articles.size;
  }
}

export const knowledgeStore = new KnowledgeStore();
