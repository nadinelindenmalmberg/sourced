import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface Deal {
  id: string;
  name: string;
  brand: string;
  price: number;
  unit: string;
  promotion: string; // e.g. "2 för 30:-"
  image: string;
  category: string; // Used to filter out non-food later
}

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
    potentialPromotions?: Array<{
      textLabel?: string;
      rewardLabel?: string;
      cartLabel?: string;
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
    
    console.log(`Fetching deals for store ${storeId}...`);
    
    const allDeals: Deal[] = [];
    let page = 0;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        const url = `https://www.hemkop.se/search/campaigns/offline?q=${storeId}&type=PERSONAL_GENERAL&page=${page}&size=30&disableMimerSort=true`;
        
        console.log(`Fetching page ${page}...`);
        
        const response = await fetch(url, {
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
            console.log('Reached max page limit, stopping');
            break;
          }
          continue;
        }
        
        const rawData: any = await response.json();
        console.log(`Page ${page} raw response keys:`, Object.keys(rawData));
        console.log(`Page ${page} raw response sample:`, JSON.stringify(rawData).substring(0, 500));
        
        // Handle different response structures
        const results = rawData.results || rawData.items || rawData.data || (Array.isArray(rawData) ? rawData : []);
        
        if (!results || results.length === 0) {
          console.log(`No more results at page ${page}, stopping pagination`);
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
            
            // Get promotion text from potentialPromotions
            let promotion = '';
            if (item.potentialPromotions && item.potentialPromotions.length > 0) {
              const promo = item.potentialPromotions[0];
              promotion = promo.cartLabel || promo.rewardLabel || promo.textLabel || '';
            }
            
            // Get image URL (prefer original, then regular, then thumbnail)
            const imageUrl = item.originalImage?.url || item.image?.url || item.thumbnail?.url || '';
            
            // Extract category from googleAnalyticsCategory (format: "category|subcategory|...")
            const category = item.googleAnalyticsCategory ? 
              item.googleAnalyticsCategory.split('|')[0] : '';
            
            return {
              id: `${item.name}-${index}-${page}`.replace(/\s+/g, '-').toLowerCase(),
              name: item.name || 'Unknown Product',
              brand: item.manufacturer || '',
              price: price,
              unit: unit,
              promotion: promotion,
              image: imageUrl,
              category: category,
            };
          });
        
        allDeals.push(...pageDeals);
        console.log(`Page ${page}: Found ${pageDeals.length} deals (Total: ${allDeals.length})`);
        
        // If we got fewer than the page size, we're probably at the end
        if (pageDeals.length < 30) {
          hasMorePages = false;
        } else {
          page++;
          // Safety limit
          if (page > 50) {
            console.log('Reached safety limit of 50 pages, stopping');
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
    
    console.log(`✅ Successfully fetched ${allDeals.length} total deals for store ${storeId}`);
    
    return NextResponse.json({
      deals: allDeals,
      count: allDeals.length,
      storeId,
      source: 'hemkop_api',
    });
    
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch deals',
        details: error instanceof Error ? error.message : 'Unknown error',
        deals: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
