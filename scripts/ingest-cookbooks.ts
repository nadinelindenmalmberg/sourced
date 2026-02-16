/**
 * Ingest Swedish cookbook PDFs from data/cookbooks into the RAG index.
 * Place up to 50 PDFs in data/cookbooks/, then run: npm run ingest
 * Requires: GOOGLE_API_KEY or GEMINI_API_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import { chunkCookbookText } from '../lib/rag/chunking';
import { embedTexts } from '../lib/rag/embeddings';
import type { EmbeddedChunk, RecipeIndex } from '../lib/rag/types';

const COOKBOOKS_DIR = path.join(process.cwd(), 'data', 'cookbooks');
const INDEX_PATH = path.join(process.cwd(), 'data', 'recipe-embeddings.json');
const MAX_BOOKS = 50;

async function extractTextFromPdf(
  filePath: string
): Promise<{ text: string; pages: number }> {
  const pdfParse = (await import('pdf-parse')).default as (
    buf: Buffer
  ) => Promise<{ text: string; numpages: number }>;
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return { text: data.text, pages: data.numpages };
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Set GOOGLE_API_KEY or GEMINI_API_KEY to run ingestion.');
    process.exit(1);
  }

  if (!fs.existsSync(COOKBOOKS_DIR)) {
    fs.mkdirSync(COOKBOOKS_DIR, { recursive: true });
    console.log(
      `Created ${COOKBOOKS_DIR}. Add up to ${MAX_BOOKS} Swedish cookbook PDFs and run again.`
    );
    process.exit(0);
  }

  const files = fs
    .readdirSync(COOKBOOKS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .slice(0, MAX_BOOKS);

  if (files.length === 0) {
    console.log(`No PDFs in ${COOKBOOKS_DIR}. Add cookbook PDFs and run again.`);
    process.exit(0);
  }

  console.log(`Processing ${files.length} PDF(s)...`);
  const allChunks: {
    chunk: { id: string; text: string; source: string; page?: number; title?: string };
    embedding: number[];
  }[] = [];

  for (const file of files) {
    const filePath = path.join(COOKBOOKS_DIR, file);
    try {
      const { text, pages } = await extractTextFromPdf(filePath);
      if (!text || text.trim().length < 100) {
        console.warn(`  Skip ${file}: too little text`);
        continue;
      }
      const chunks = chunkCookbookText(text, file, undefined);
      console.log(`  ${file}: ${pages} pages → ${chunks.length} chunks`);
      for (const c of chunks) {
        allChunks.push({ chunk: c, embedding: [] });
      }
    } catch (e) {
      console.warn(`  Error ${file}:`, e);
    }
  }

  if (allChunks.length === 0) {
    console.error('No chunks produced.');
    process.exit(1);
  }

  console.log(`Embedding ${allChunks.length} chunks...`);
  const texts = allChunks.map((x) => x.chunk.text);
  const embeddings = await embedTexts(texts, apiKey, {
    delayMs: 100,
    concurrency: 5,
  });

  const embeddedChunks: EmbeddedChunk[] = allChunks.map((item, i) => ({
    ...item.chunk,
    embedding: embeddings[i] ?? [],
  }));

  const index: RecipeIndex = {
    chunks: embeddedChunks,
    meta: {
      createdAt: new Date().toISOString(),
      bookCount: files.length,
      chunkCount: embeddedChunks.length,
      embeddingModel: 'text-embedding-004',
    },
  };

  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index), 'utf-8');
  console.log(
    `Wrote ${INDEX_PATH} (${index.meta.chunkCount} chunks from ${index.meta.bookCount} books).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
