/**
 * GET /api/deals
 *
 * Fetches current campaign/deal products from Hemköp for a given store.
 * Paginates the campaigns API and maps results to a unified Deal shape
 * (id, name, brand, price, unit, promotion, image, category).
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
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=300',
};
const dealsCache = new Map<string, { data: Deal[]; timestamp: number }>();

export type { Deal };

interface HemkopApiResponse {
  results: Array<{
    name: string;
    title?: string;
    manufacturer?: string;
    price?: string; // e.g. "11,95 kr"
    priceNoUnit?: string; // e.g. "11,95"
    priceUnit?: string; // e.g. "kr/st"
    image?: {
      url?: string;
    };
    thumbnail?: {
      url?: string;
    };
    originalImage?: {
      url?: string;
    };
    comparePrice?: string;
    potentialPromotions?: Array<{
      textLabel?: string;
      rewardLabel?: string;
      cartLabel?: string;
      comparePrice?: string;
      price?: number;
    }>;
    googleAnalyticsCategory?: string;
    [key: string]: any;
  }>;
  total?: number;
  page?: number;
  size?: number;
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
          { deals: cached.data, count: cached.data.length, storeId, source: 'hemkop_api' },
          { headers: CACHE_HEADERS }
        );
      }
    }

    const allDeals: Deal[] = [];
    let page = 0;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        const url = `https://www.hemkop.se/search/campaigns/offline?q=${storeId}&type=PERSONAL_GENERAL&page=${page}&size=30&disableMimerSort=true`;
        
        const response = await fetch(url, {
          cache: 'no-store',
          next: { revalidate: 0 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.hemkop.se/',
          },
        });
        
        if (!response.ok) {
          console.error(`API returned status ${response.status} for page ${page}`);
          if (response.status === 404 || response.status >= 500) {
            hasMorePages = false;
            break;
          }
          // For other errors, try next page or break
          page++;
          if (page > 10) {
            break;
          }
          continue;
        }
        
        const rawData: any = await response.json();
        // Handle different response structures
        const results = rawData.results || rawData.items || rawData.data || (Array.isArray(rawData) ? rawData : []);
        
        if (!results || results.length === 0) {
          hasMorePages = false;
          break;
        }
        
        // Map the API response to our clean Deal interface
        const pageDeals: Deal[] = results
          .filter((item: any) => {
            // Filter out invalid items - must have a name
            return item.name && item.name.trim().length > 0;
          })
          .map((item: any, index: number) => {
            // Extract price number (handle Swedish decimal format "11,95")
            const priceStr = item.priceNoUnit || (item.price ? item.price.replace(/[^\d,]/g, '').replace(',', '.') : '0');
            const price = parseFloat(priceStr) || 0;
            
            // Extract unit from priceUnit (e.g. "kr/st" -> "st")
            const unit = item.priceUnit ? item.priceUnit.split('/').pop() || 'st' : 'st';
            
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
            
            // Get image URL (prefer original, then regular, then thumbnail)
            const imageUrl = item.originalImage?.url || item.image?.url || item.thumbnail?.url || '';
            
            // Extract category from googleAnalyticsCategory (format: "category|subcategory|...")
            let category = item.googleAnalyticsCategory
              ? item.googleAnalyticsCategory.split('|')[0]
              : '';

            // Name-based fallback when the API gives no category
            if (!category) {
              const nameLower = (item.name || '').toLowerCase();
              if (/br[öo]d|levain|baguette|limpa|kn[äa]cke|croissant|bulle|bagel|muffin|kaka|tårta|paj|kex/.test(nameLower)) {
                category = 'brod-och-kakor';
              } else if (/mjölk|yoghurt|kvarg|ost|smör|grädde|ägg|fil|crème fraiche/.test(nameLower)) {
                category = 'mejeri-ost-och-agg';
              } else if (/kyckl|nöt|fläsk|lamm|köt|korv|chark|bacon|skinka/.test(nameLower)) {
                category = 'kott-fagel-och-chark';
              } else if (/lax|torsk|räk|fisk|sill|tonfisk|skaldjur/.test(nameLower)) {
                category = 'fisk-och-skaldjur';
              } else if (/äpple|päron|banan|apelsin|tomat|gurka|lök|morot|potatis|grönt|sallad|frukt/.test(nameLower)) {
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
        
        allDeals.push(...pageDeals);

        // Determine end-of-pagination from the raw page size, not mapped count.
        // Some items may be filtered out (e.g. missing name), and that should not
        // make us stop early and miss later pages/categories.
        if (results.length < 30) {
          hasMorePages = false;
        } else {
          page++;
          // Safety limit
          if (page > 50) {
            hasMorePages = false;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        // If it's a network error, try one more time then break
        if (page === 0) {
          // First page failed, might be a real error
          throw error;
        }
        hasMorePages = false;
        break;
      }
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
