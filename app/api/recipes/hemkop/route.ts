import { NextRequest, NextResponse } from 'next/server';
import type { HemkopRecipe } from '@/types/hemkop-recipe';

export const dynamic = 'force-dynamic';

const HEMKOP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Referer: 'https://www.hemkop.se/',
};

/** Search queries to fetch batches of recipes from receptsok (20 per page). */
const SEARCH_QUERIES = [
  '', // first page "all" -> 2673 total, 20 per page
  'kyckling',
  'kött',
  'fisk',
  'pasta',
  'soppa',
  'sallad',
  'grönsak',
  'dessert',
  'bakverk',
  'gryta',
  'korv',
  'potatis',
  'ris',
  'ost',
  'ägg',
  'pannkaka',
  'tacos',
  'lasagne',
  'pizza',
];

const DELAY_MS = 300;
const BASE_RECEPT_URL = 'https://www.hemkop.se/recept';

/** Strip HTML and decode basic entities. */
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .trim();
}

/** Parse __NEXT_DATA__ from Hemköp receptsok HTML. */
function parseNextData(html: string): { results: any[]; pagination?: any } | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    const recipes = data?.props?.pageProps?.recipes;
    if (!recipes) return null;
    return {
      results: recipes.results || [],
      pagination: recipes.pagination,
    };
  } catch {
    return null;
  }
}

/** Build image URL from Hemköp cloudinary template (they use {h}, {w}, {device}). */
function buildImageUrl(cloudinaryUrl: string | undefined): string | undefined {
  if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') return undefined;
  return cloudinaryUrl
    .replace(/\{h\}/g, '630')
    .replace(/\{w\}/g, '1200')
    .replace(/\{device\}/g, 'desktop')
    .trim();
}

/** Map Hemköp receptsok result to our HemkopRecipe. */
function mapReceptsokToRecipe(item: any): HemkopRecipe {
  const id = item.id || item.slug || '';
  const name = item.name || item.title || 'Recept';
  const imageUrl = item.image?.cloudinaryUrl
    ? buildImageUrl(item.image.cloudinaryUrl)
    : undefined;
  const url = id ? `${BASE_RECEPT_URL}/${id}?searchResult=true` : undefined;
  const shortDesc = stripHtml(item.shortDescription || '');
  const fullDesc = stripHtml(item.description || '');
  const description = shortDesc || fullDesc || undefined;
  const time_minutes = item.cookingTime ?? item.cookTime ?? undefined;
  const servings = item.portions ?? item.servings ?? undefined;

  return {
    id: id || `hemkop-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name: typeof name === 'string' ? name : String(name),
    description: description || undefined,
    image: imageUrl,
    url,
    time_minutes: typeof time_minutes === 'number' ? time_minutes : undefined,
    servings: typeof servings === 'number' ? servings : undefined,
    ingredients: Array.isArray(item.recipeMainIngredients)
      ? item.recipeMainIngredients
      : undefined,
    instructions: undefined, // receptsok list view doesn't include full instructions
    source: 'hemkop_api',
  };
}

/** Fetch one page of recipes from receptsok (optional q and currentPage). */
async function fetchReceptsokPage(
  q: string,
  currentPage: number = 0
): Promise<{ recipes: HemkopRecipe[]; total?: number; numberOfPages?: number }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (currentPage > 0) params.set('currentPage', String(currentPage));
  const url = `https://www.hemkop.se/receptsok${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, { headers: HEMKOP_HEADERS });
  if (!res.ok) return { recipes: [] };
  const html = await res.text();
  const parsed = parseNextData(html);
  if (!parsed || !parsed.results.length) return { recipes: [] };

  const recipes = parsed.results
    .filter((item: any) => item && (item.id || item.name || item.title))
    .map((item: any) => mapReceptsokToRecipe(item));

  return {
    recipes,
    total: parsed.pagination?.totalNumberOfResults,
    numberOfPages: parsed.pagination?.numberOfPages,
  };
}

/** Fetch recipes from receptsok using multiple queries and optional pagination, dedupe by id. */
async function fetchAllHemkopRecipes(maxTotal: number = 500): Promise<HemkopRecipe[]> {
  const byId = new Map<string, HemkopRecipe>();

  for (const q of SEARCH_QUERIES) {
    if (byId.size >= maxTotal) break;
    let page = 0;
    let hasMore = true;
    while (hasMore && byId.size < maxTotal) {
      const { recipes, numberOfPages } = await fetchReceptsokPage(q, page);
      for (const r of recipes) {
        if (!byId.has(r.id)) byId.set(r.id, r);
      }
      hasMore =
        recipes.length >= 20 &&
        (numberOfPages == null || page + 1 < numberOfPages) &&
        page < 10; // max 10 pages per query to avoid hammering
      page++;
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return Array.from(byId.values());
}

/** Fallback: fetch recipes from Spoonacular (nordic cuisine). */
async function fetchSpoonacularRecipes(apiKey: string, maxRecipes: number = 200): Promise<HemkopRecipe[]> {
  const all: HemkopRecipe[] = [];
  let offset = 0;
  const limit = 30;

  while (all.length < maxRecipes) {
    const url = new URL('https://api.spoonacular.com/recipes/complexSearch');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('number', String(limit));
    url.searchParams.set('cuisine', 'nordic');
    url.searchParams.set('addRecipeInformation', 'true');
    url.searchParams.set('fillIngredients', 'true');
    url.searchParams.set('instructionsRequired', 'true');

    const res = await fetch(url.toString());
    if (!res.ok) break;
    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        title: string;
        image?: string;
        readyInMinutes?: number;
        servings?: number;
        sourceUrl?: string;
        summary?: string;
        extendedIngredients?: Array<{ original?: string; name?: string }>;
        analyzedInstructions?: Array<{ steps?: Array<{ step?: string }> }>;
      }>;
    };
    const results = data.results || [];
    if (results.length === 0) break;

    for (const r of results) {
      all.push({
        id: `spoonacular-${r.id}`,
        name: r.title || '',
        description: r.summary?.replace(/<[^>]*>/g, ''),
        image: r.image,
        url: r.sourceUrl,
        time_minutes: r.readyInMinutes,
        servings: r.servings,
        ingredients: r.extendedIngredients?.map((i) => i.original || i.name || ''),
        instructions: r.analyzedInstructions?.[0]?.steps?.map((s) => s.step || ''),
        source: 'spoonacular_fallback',
      });
    }
    offset += limit;
    if (results.length < limit) break;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return all;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useFallback = searchParams.get('fallback') === 'true' || searchParams.get('fallback') === '1';
    const q = searchParams.get('q'); // optional: single search query
    const maxParam = searchParams.get('max');
    const maxTotal = maxParam ? Math.min(parseInt(maxParam, 10) || 500, 1000) : 500;

    if (q !== null && q !== undefined) {
      // Single search: one query (and paginate that query)
      const allRecipes: HemkopRecipe[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { recipes, numberOfPages } = await fetchReceptsokPage(q, page);
        allRecipes.push(...recipes);
        hasMore = recipes.length >= 20 && (numberOfPages == null || page + 1 < numberOfPages) && page < 50;
        page++;
        if (page > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      const deduped = Array.from(new Map(allRecipes.map((r) => [r.id, r])).values());
      return NextResponse.json({
        recipes: deduped,
        count: deduped.length,
        source: 'hemkop_api',
        query: q,
      });
    }

    console.log('Fetching Hemköp recipes from receptsok...');
    const allRecipes = await fetchAllHemkopRecipes(maxTotal);
    console.log(`Fetched ${allRecipes.length} unique Hemköp recipes.`);

    if (allRecipes.length === 0 && useFallback) {
      const apiKey = process.env.SPOONACULAR_API_KEY;
      if (apiKey) {
        const fallbackRecipes = await fetchSpoonacularRecipes(apiKey, maxTotal);
        console.log(`Fallback: ${fallbackRecipes.length} recipes from Spoonacular.`);
        return NextResponse.json({
          recipes: fallbackRecipes,
          count: fallbackRecipes.length,
          source: 'spoonacular_fallback',
          message: 'Visar recept från Spoonacular (nordic) som reserv.',
        });
      }
    }

    return NextResponse.json({
      recipes: allRecipes,
      count: allRecipes.length,
      source: allRecipes.length > 0 ? 'hemkop_api' : 'hemkop_api_unavailable',
      message:
        allRecipes.length === 0
          ? 'Kunde inte hämta recept från receptsok. Prova ?fallback=true (kräver SPOONACULAR_API_KEY).'
          : undefined,
    });
  } catch (error) {
    console.error('Error fetching Hemköp recipes:', error);
    return NextResponse.json(
      {
        error: 'Kunde inte hämta recept',
        details: error instanceof Error ? error.message : 'Unknown error',
        recipes: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
