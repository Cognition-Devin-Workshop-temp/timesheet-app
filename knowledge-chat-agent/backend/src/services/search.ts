import { knowledgeStore } from "./knowledge-store";
import type { SearchResult } from "../types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function computeQueryTF(tokens: string[]): Record<string, number> {
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

function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

export function searchKnowledge(
  query: string,
  topK: number = 5
): SearchResult[] {
  const queryTokens = tokenize(query);
  const queryTF = computeQueryTF(queryTokens);
  const allChunks = knowledgeStore.getAllChunks();

  if (allChunks.length === 0) return [];

  const scored: SearchResult[] = allChunks.map(
    ({ chunk, articleTitle, articleId }) => ({
      chunk,
      articleTitle,
      articleId,
      score: cosineSimilarity(queryTF, chunk.terms),
    })
  );

  scored.sort((a, b) => b.score - a.score);

  return scored.filter((r) => r.score > 0).slice(0, topK);
}
