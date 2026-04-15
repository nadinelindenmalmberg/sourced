/**
 * POST /api/generate
 *
 * Generates 1–3 Swedish recipes from a list of ingredients (e.g. campaign/deal items).
 * Streams recipes one-by-one as newline-delimited JSON (NDJSON) using OpenAI streaming.
 *
 * Body: { ingredients: string[], difficulty?: 'easy'|'medium'|'hard'|'varied', deals?: Deal[] }
 * Returns: NDJSON stream — one Recipe JSON object per line
 * Requires: OPENAI_API_KEY in .env.local
 */
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { generateRecipeContext, SWEDISH_RECIPE_CONTEXT } from '@/lib/recipe-context';

export const dynamic = 'force-dynamic';

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI API key not configured');
  return new OpenAI({ apiKey: key });
}

export interface RecipeRequest {
  ingredients: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'varied';
  deals?: Array<{
    name: string;
    promotion?: string;
    price?: number;
    unit?: string;
    category?: string;
  }>;
}

export interface Recipe {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_minutes: number;
  servings: number;
  ingredients: Array<{ item: string; amount: string; from_deal?: boolean }>;
  instructions: string[];
  tips?: string;
  search_query: string;
}

function normalizeRecipe(r: any): Recipe | null {
  if (!r?.title || !r?.ingredients || !r?.instructions) return null;
  return {
    title: r.title,
    description: r.description || '',
    difficulty: r.difficulty || 'medium',
    time_minutes: r.time_minutes || 30,
    servings: r.servings || 4,
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map((i: any) => ({
          item: typeof i === 'string' ? i : i.item || i.name || '',
          amount: typeof i === 'string' ? '' : i.amount || i.quantity || '',
          from_deal: i.from_deal || false,
        }))
      : [],
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
    tips: r.tips || null,
    search_query: r.search_query || r.title || '',
  };
}

/** Find the end index of the next complete JSON object starting at or after `from` in `text`. */
function findCompleteObject(
  text: string,
  from: number
): { json: string; end: number } | null {
  let i = from;
  while (i < text.length && text[i] !== '{') i++;
  if (i >= text.length) return null;

  const start = i;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { json: text.slice(start, i + 1), end: i + 1 };
    }
  }
  return null; // object not yet complete
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const emitError = (msg: string, status = 500) =>
    new Response(JSON.stringify({ error: msg }) + '\n', {
      status,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

  let body: RecipeRequest;
  try {
    body = await request.json();
  } catch {
    return emitError('Invalid request body', 400);
  }

  const { ingredients, difficulty = 'varied', deals } = body;
  if (!ingredients || ingredients.length < 1) return emitError('Minst 1 ingrediens krävs', 400);

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    return emitError('OpenAI API-nyckel saknas. Sätt OPENAI_API_KEY i .env.local.', 500);
  }

  const recipeContext = generateRecipeContext(ingredients, difficulty);
  const recipeCount = ingredients.length === 1 ? 2 : 3;

  const systemPrompt = `Du är en erfaren svensk hemmakock som skapar praktiska, goda vardagsrecept.

${SWEDISH_RECIPE_CONTEXT}

VIKTIGT:
- Skriv ALLTID på svenska
- Ge EXAKTA mängder (t.ex. "400g kycklingfilé", "2 dl grädde", "1 msk smör")
- Ge EXAKTA tider (t.ex. "stek i 5 minuter", "koka i 20 minuter")
- Ge temperaturer när relevant (t.ex. "175°C ugn", "medelhög värme")
- Recepten ska vara REALISTISKA - sådant folk faktiskt lagar
- Använd kampanjvarorna som huvudingredienser

OUTPUT FORMAT - returnera EXAKT denna JSON-struktur:
{
  "recipes": [
    {
      "title": "Receptnamn",
      "description": "En mening som beskriver rätten",
      "difficulty": "easy|medium|hard",
      "time_minutes": 30,
      "servings": 4,
      "ingredients": [
        {"item": "Kycklingfilé", "amount": "400g", "from_deal": true},
        {"item": "Grädde", "amount": "2 dl", "from_deal": false},
        {"item": "Salt", "amount": "1 tsk", "from_deal": false}
      ],
      "instructions": [
        "Skär kycklingen i bitar och krydda med salt och peppar.",
        "Hetta upp smör i en stekpanna på medelhög värme.",
        "Stek kycklingen i 5-6 minuter tills den är genomstekt."
      ],
      "tips": "Servera med ris eller pasta.",
      "search_query": "kycklinggryta grädde recept"
    }
  ]
}`;

  const dealInfo =
    deals && deals.length > 0
      ? `\n\nKAMPANJINFO:\n${deals.map((d) => `- ${d.name}: ${d.promotion || `${d.price} kr`}`).join('\n')}`
      : '';

  const userPrompt = `${recipeContext}${dealInfo}

Skapa ${recipeCount} olika recept. Varje recept ska:
1. Bygga på kampanjvarorna som huvudingredienser — fyll ut med vanliga basvaror
2. Vara olika typer av rätter (variation!)
3. Ha tydliga, konkreta instruktioner med exakta mängder och tider
4. Markera vilka ingredienser som kommer från kampanjen (from_deal: true)

Returnera ENDAST giltig JSON enligt formatet ovan med nyckeln "recipes" innehållande en array med ${recipeCount} recept.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const openaiStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          stream: true,
        });

        let buffer = '';
        let recipesArrayStart = -1;
        let searchFrom = 0;
        let extractedCount = 0;

        for await (const chunk of openaiStream) {
          buffer += chunk.choices[0]?.delta?.content ?? '';

          // Locate the start of the recipes array once
          if (recipesArrayStart === -1) {
            const keyIdx = buffer.indexOf('"recipes"');
            if (keyIdx !== -1) {
              const arrIdx = buffer.indexOf('[', keyIdx);
              if (arrIdx !== -1) {
                recipesArrayStart = arrIdx + 1;
                searchFrom = recipesArrayStart;
              }
            }
          }
          if (recipesArrayStart === -1) continue;

          // Extract complete recipe objects as they become available
          while (extractedCount < recipeCount) {
            const result = findCompleteObject(buffer, searchFrom);
            if (!result) break;
            try {
              const normalized = normalizeRecipe(JSON.parse(result.json));
              if (normalized) {
                controller.enqueue(encoder.encode(JSON.stringify(normalized) + '\n'));
                extractedCount++;
              }
            } catch { /* ignore malformed partial JSON */ }
            searchFrom = result.end;
          }

          if (extractedCount >= recipeCount) break;
        }

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Okänt fel';
        const lower = message.toLowerCase();
        const isAuthError =
          lower.includes('invalid_api_key') ||
          lower.includes('incorrect api key') ||
          lower.includes('authenticationerror') ||
          lower.includes('401');
        const errMsg = isAuthError
          ? 'Ogiltig OPENAI_API_KEY. Kontrollera att nyckeln är aktiv och korrekt (platform.openai.com).'
          : `Kunde inte generera recept: ${message}`;
        controller.enqueue(encoder.encode(JSON.stringify({ error: errMsg }) + '\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  });
}
