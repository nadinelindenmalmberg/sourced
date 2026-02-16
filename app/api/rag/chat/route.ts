import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import type { RecipeIndex } from '@/lib/rag/types';
import { embedText } from '@/lib/rag/embeddings';
import { searchChunks, formatChunksForContext } from '@/lib/rag/vector-store';

const INDEX_PATH = path.join(process.cwd(), 'data', 'recipe-embeddings.json');
const TOP_K = 8;

function loadIndex(): RecipeIndex | null {
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
    return JSON.parse(raw) as RecipeIndex;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_API_KEY or GEMINI_API_KEY' },
      { status: 500 }
    );
  }

  const index = loadIndex();
  if (!index) {
    return NextResponse.json(
      {
        error:
          'Recipe index not found. Run: npm run ingest (after adding PDFs to data/cookbooks/)',
      },
      { status: 503 }
    );
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json(
      { error: 'Body must include a non-empty message' },
      { status: 400 }
    );
  }

  try {
    const queryEmbedding = await embedText(message, apiKey);
    const chunks = searchChunks(index, queryEmbedding, TOP_K);
    const context = formatChunksForContext(chunks);

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Du är en hjälpsam assistent som svarar utifrån utvalda recept och texter från svenska kokböcker. Svara endast utifrån den angivna kontexten när det är möjligt. Svara på samma språk som användaren (svenska eller engelska).

Kontext från kokböcker:
---
${context}
---

Användarens fråga: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text =
      response.text ??
      (response.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .join('')) ??
      '';

    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error('RAG chat error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'RAG request failed' },
      { status: 500 }
    );
  }
}
