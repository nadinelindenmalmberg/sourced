/**
 * In-memory vector store with cosine similarity for RAG retrieval.
 */

import type { EmbeddedChunk, RecipeIndex } from './types';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function searchChunks(
  index: RecipeIndex,
  queryEmbedding: number[],
  topK: number = 8
): EmbeddedChunk[] {
  const withScore = index.chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(chunk.embedding, queryEmbedding),
  }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.slice(0, topK).map((x) => x.chunk);
}

export function formatChunksForContext(chunks: EmbeddedChunk[]): string {
  return chunks
    .map((c) => {
      const header = c.title ? `[${c.title}]` : `[Källa: ${c.source}]`;
      return `${header}\n${c.text}`;
    })
    .join('\n\n---\n\n');
}
