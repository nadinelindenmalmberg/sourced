/**
 * Chunk cookbook text by recipe/section for better retrieval.
 */

import type { RecipeChunk } from './types';

const MIN_CHUNK_CHARS = 200;
const MAX_CHUNK_CHARS = 1200;
const OVERLAP_CHARS = 80;

const RECIPE_HEADER_PATTERN = /^(?:recept|rätt|rätter|soppa|förrätt|huvudrätt|efterrätt|bakverk|sås|sallad|grönsak|fisk|kött|vegetariskt|frukost|middag|dessert|kaka|bröd|sylt|inläggning)\s*[:\-]?\s*$/im;
const INGREDIENTS_PATTERN = /^ingredienser\s*[:\-]?\s*$/im;
const INSTRUCTION_PATTERN = /^(?:tillagning|gör så här|instruktioner|så här gör du|framställning)\s*[:\-]?\s*$/im;

export function chunkCookbookText(
  fullText: string,
  source: string,
  page?: number
): RecipeChunk[] {
  const chunks: RecipeChunk[] = [];
  const lines = fullText.split(/\r?\n/);
  let currentBlock: string[] = [];
  let currentTitle: string | undefined;
  let blockStartLine = 0;

  function flushBlock() {
    const text = currentBlock.join('\n').trim();
    if (text.length < 50) return;
    const parts = splitBySize(text, MAX_CHUNK_CHARS, OVERLAP_CHARS);
    parts.forEach((part, i) => {
      chunks.push({
        id: `${source}:${page ?? 0}:${blockStartLine}:${i}`,
        text: part,
        source,
        page,
        title: currentTitle,
      });
    });
    currentBlock = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const looksLikeHeader =
      RECIPE_HEADER_PATTERN.test(trimmed) ||
      INGREDIENTS_PATTERN.test(trimmed) ||
      INSTRUCTION_PATTERN.test(trimmed);

    if (looksLikeHeader && currentBlock.length > 0) {
      flushBlock();
      blockStartLine = i;
      if (RECIPE_HEADER_PATTERN.test(trimmed)) {
        currentTitle = trimmed.replace(/[:\-]\s*$/, '').trim();
      }
    } else if (looksLikeHeader && currentBlock.length === 0) {
      currentTitle = trimmed.replace(/[:\-]\s*$/, '').trim();
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) flushBlock();

  if (chunks.length === 0 && fullText.trim().length >= MIN_CHUNK_CHARS) {
    const parts = splitBySize(fullText.trim(), MAX_CHUNK_CHARS, OVERLAP_CHARS);
    parts.forEach((part, i) => {
      chunks.push({
        id: `${source}:${page ?? 0}:fallback:${i}`,
        text: part,
        source,
        page,
      });
    });
  }

  return chunks;
}

function splitBySize(text: string, maxSize: number, overlap: number): string[] {
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    if (end < text.length) {
      const lastBreak = text.lastIndexOf('\n', end);
      if (lastBreak > start) end = lastBreak;
      else {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) end = lastSpace;
      }
    }
    parts.push(text.slice(start, end).trim());
    start = end - (end < text.length ? overlap : 0);
  }
  return parts.filter((p) => p.length >= MIN_CHUNK_CHARS);
}
