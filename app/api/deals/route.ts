/**
 * GET /api/deals
 *
 * Fetches current campaign/deal products from Hemköp for a given store.
 * Uses Hemköp's pagination metadata to fetch all pages in bounded parallel
 * chunks (fast) instead of serial requests with artificial delays.
 *
 * Query: ?storeId=4547 (optional, default 4547)
 * Returns: { deals: Deal[], count: number, storeId: string, source: 'hemkop_api' }
 *          or { error, deals: [], count: 0 } on failure.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Deal } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 60 * 60 * 6; // 6 hours

const NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
/** Shared + browser cache: deals change weekly; warm CDN and repeat visits stay fast. */
const CACHE_HEADERS = {
  'Cache-Control':
    'public, s-maxage=21600, max-age=600, stale-while-revalidate=300',
};
const dealsCache = new Map<string, { data: Deal[]; timestamp: number }>();
/** Same-store requests in parallel share one upstream fetch (helps React Strict Mode / double taps). */
const dealsInFlight = new Map<string, Promise<Deal[]>>();

export type { Deal };

const HEMKOP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.hemkop.se/',
};

const MAX_PAGES = 51; // pages 0..50
/** Parallel outbound requests per batch to Hemköp (balance latency vs. rate limits). */
const PARALLEL_CHUNK = 10;

function campaignUrl(storeId: string, page: number): string {
  return `https://www.hemkop.se/search/campaigns/offline?q=${storeId}&type=PERSONAL_GENERAL&page=${page}&size=30&disableMimerSort=true`;
}

async function fetchHemkopPage(
  storeId: string,
  page: number
): Promise<{
  ok: boolean;
  status: number;
  results: any[];
  numberOfPages?: number;
}> {
  const response = await fetch(campaignUrl(storeId, page), {
    cache: 'no-store',
    headers: HEMKOP_HEADERS,
  });
  if (!response.ok) {
    return { ok: false, status: response.status, results: [] };
  }
  const rawData: any = await response.json();
  const results =
    rawData.results ||
    rawData.items ||
    rawData.data ||
    (Array.isArray(rawData) ? rawData : []);
  const numberOfPages =
    typeof rawData.pagination?.numberOfPages === 'number'
      ? rawData.pagination.numberOfPages
      : undefined;
  return { ok: true, status: response.status, results, numberOfPages };
}

function mapItemsToDeals(results: any[], page: number): Deal[] {
  return results
    .filter((item: any) => item.name && item.name.trim().length > 0)
    .map((item: any, index: number) => {
      const priceStr =
        item.priceNoUnit ||
        (item.price
          ? item.price.replace(/[^\d,]/g, '').replace(',', '.')
          : '0');
      const price = parseFloat(priceStr) || 0;

      const unit = item.priceUnit
        ? item.priceUnit.split('/').pop() || 'st'
        : 'st';

      let promotion = '';
      let rewardLabel: string | undefined;
      let comparePrice: string | undefined;
      if (item.potentialPromotions && item.potentialPromotions.length > 0) {
        const promo = item.potentialPromotions[0];
        promotion = promo.cartLabel || promo.textLabel || '';
        rewardLabel = promo.rewardLabel || undefined;
        comparePrice = promo.comparePrice || item.comparePrice || undefined;
      } else {
        comparePrice = item.comparePrice || undefined;
      }

      const imageUrl =
        item.originalImage?.url ||
        item.image?.url ||
        item.thumbnail?.url ||
        '';

      let category = item.googleAnalyticsCategory
        ? item.googleAnalyticsCategory.split('|')[0]
        : '';

      if (!category) {
        const nameLower = (item.name || '').toLowerCase();
        if (
          /br[öo]d|levain|baguette|limpa|kn[äa]cke|croissant|bulle|bagel|muffin|kaka|tårta|paj|kex/.test(
            nameLower
          )
        ) {
          category = 'brod-och-kakor';
        } else if (
          /mjölk|yoghurt|kvarg|ost|smör|grädde|ägg|fil|crème fraiche/.test(
            nameLower
          )
        ) {
          category = 'mejeri-ost-och-agg';
        } else if (
          /kyckl|nöt|fläsk|lamm|köt|korv|chark|bacon|skinka/.test(nameLower)
        ) {
          category = 'kott-fagel-och-chark';
        } else if (
          /lax|torsk|räk|fisk|sill|tonfisk|skaldjur/.test(nameLower)
        ) {
          category = 'fisk-och-skaldjur';
        } else if (
          /äpple|päron|banan|apelsin|tomat|gurka|lök|morot|potatis|grönt|sallad|frukt/.test(
            nameLower
          )
        ) {
          category = 'frukt-och-gront';
        }
      }

      return {
        id: `${item.name}-${index}-${page}`.replace(/\s+/g, '-').toLowerCase(),
        name: item.name || 'Unknown Product',
        brand: item.manufacturer || '',
        price: price,
        unit: unit,
        promotion: promotion,
        rewardLabel,
        image: imageUrl,
        category: category,
        comparePrice,
      };
    });
}

/** When pagination metadata is missing, walk pages sequentially (no artificial delay). */
async function fetchAllDealsSequential(
  storeId: string,
  firstResults: any[]
): Promise<Deal[]> {
  const allDeals: Deal[] = mapItemsToDeals(firstResults, 0);
  let lastResults = firstResults;
  let page = 0;
  while (lastResults.length >= 30 && page < 50) {
    page++;
    const res = await fetchHemkopPage(storeId, page);
    if (!res.ok || !res.results?.length) break;
    lastResults = res.results;
    allDeals.push(...mapItemsToDeals(lastResults, page));
  }
  return allDeals;
}

async function fetchAllDealsForStore(storeId: string): Promise<Deal[]> {
  const first = await fetchHemkopPage(storeId, 0);
  if (!first.ok) {
    if (first.status === 404 || first.status >= 500) {
      throw new Error(`Hemköp API returned ${first.status} for page 0`);
    }
    throw new Error(`Hemköp API returned ${first.status} for page 0`);
  }

  const firstResults = first.results;
  if (!firstResults?.length) {
    return [];
  }

  if (first.numberOfPages == null || first.numberOfPages < 1) {
    return fetchAllDealsSequential(storeId, firstResults);
  }

  const pagesToFetch = Math.min(first.numberOfPages, MAX_PAGES);
  const pageBuckets: { page: number; deals: Deal[] }[] = [
    { page: 0, deals: mapItemsToDeals(firstResults, 0) },
  ];

  const restPageNums: number[] = [];
  for (let p = 1; p < pagesToFetch; p++) {
    restPageNums.push(p);
  }

  for (let i = 0; i < restPageNums.length; i += PARALLEL_CHUNK) {
    const chunk = restPageNums.slice(i, i + PARALLEL_CHUNK);
    const chunkOut = await Promise.all(
      chunk.map(async (p) => {
        const res = await fetchHemkopPage(storeId, p);
        if (!res.ok || !res.results?.length) {
          console.error(
            `Hemköp campaigns page ${p} failed or empty (status ${res.status})`
          );
          return { page: p, deals: [] as Deal[] };
        }
        return { page: p, deals: mapItemsToDeals(res.results, p) };
      })
    );
    pageBuckets.push(...chunkOut);
  }

  pageBuckets.sort((a, b) => a.page - b.page);
  return pageBuckets.flatMap((b) => b.deals);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId') || '4547';
    const forceFresh = searchParams.get('refresh') === '1';

    if (!forceFresh) {
      const cached = dealsCache.get(storeId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(
          {
            deals: cached.data,
            count: cached.data.length,
            storeId,
            source: 'hemkop_api',
          },
          { headers: CACHE_HEADERS }
        );
      }
    }

    let allDeals: Deal[];
    if (forceFresh) {
      allDeals = await fetchAllDealsForStore(storeId);
    } else {
      let load = dealsInFlight.get(storeId);
      if (!load) {
        load = fetchAllDealsForStore(storeId).finally(() => {
          dealsInFlight.delete(storeId);
        });
        dealsInFlight.set(storeId, load);
      }
      allDeals = await load;
    }

    dealsCache.set(storeId, { data: allDeals, timestamp: Date.now() });

    return NextResponse.json(
      {
        deals: allDeals,
        count: allDeals.length,
        storeId,
        source: 'hemkop_api',
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deals',
        details: error instanceof Error ? error.message : 'Unknown error',
        deals: [],
        count: 0,
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
