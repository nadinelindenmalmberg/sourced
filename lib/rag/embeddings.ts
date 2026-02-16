/**
 * Google text-embedding-004 via REST (same API key as Gemini).
 */

const EMBED_API =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(EMBED_API + `?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text: text.slice(0, 2048) }],
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embed API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error('Invalid embed response: missing embedding.values');
  }
  return values;
}

export async function embedTexts(
  texts: string[],
  apiKey: string,
  options?: { delayMs?: number; concurrency?: number }
): Promise<number[][]> {
  const delayMs = options?.delayMs ?? 50;
  const concurrency = options?.concurrency ?? 5;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((text) => embedText(text, apiKey)));
    results.push(...batchResults);
    if (i + concurrency < texts.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}
