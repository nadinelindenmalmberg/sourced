/**
 * RAG types for Swedish cookbook recipe retrieval.
 */

export interface RecipeChunk {
  id: string;
  text: string;
  source: string;
  page?: number;
  title?: string;
}

export interface EmbeddedChunk extends RecipeChunk {
  embedding: number[];
}

export interface RecipeIndex {
  chunks: EmbeddedChunk[];
  meta: {
    createdAt: string;
    bookCount: number;
    chunkCount: number;
    embeddingModel: string;
  };
}
