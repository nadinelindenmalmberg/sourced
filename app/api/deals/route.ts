import { NextResponse } from 'next/server';

export interface Deal {
  name: string;
  price: number;
  category?: string;
  originalPrice?: number;
  discount?: number;
}

export async function GET() {
  try {
    const deals: Deal[] = [];
    const baseUrl = 'https://www.hemkop.se';
    let page = 1;
    let hasMorePages = true;

    // Non-food keywords to filter out
    const nonFoodKeywords = [
      'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
      'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
      'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare'
    ];

    while (hasMorePages && page <= 20) { // Limit to 20 pages for safety
      try {
        const url = `${baseUrl}/kampanjer?page=${page}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!response.ok) {
          hasMorePages = false;
          break;
        }

        const html = await response.text();
        
        // Extract deals from HTML using regex patterns
        // This is a simplified parser - in production, you'd use a proper HTML parser
        const dealPattern = /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
        const matches = html.match(dealPattern) || [];

        for (const match of matches) {
          // Extract name
          const nameMatch = match.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i) || 
                           match.match(/data-product-name="([^"]+)"/i) ||
                           match.match(/title="([^"]+)"/i);
          
          // Extract price
          const priceMatch = match.match(/(\d+)[,\s]*(\d+)?\s*kr/i) || 
                            match.match(/data-price="([^"]+)"/i) ||
                            match.match(/price[^>]*>([^<]+)</i);
          
          // Extract category if available
          const categoryMatch = match.match(/data-category="([^"]+)"/i) ||
                               match.match(/category[^>]*>([^<]+)</i);

          if (nameMatch && priceMatch) {
            const name = nameMatch[1].trim();
            const priceStr = priceMatch[1] || priceMatch[2];
            const price = parseFloat(priceStr?.replace(/\s/g, '') || '0');
            
            // Skip if it's a non-food item
            const isNonFood = nonFoodKeywords.some(keyword => 
              name.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (isNonFood || price === 0) continue;

            const category = categoryMatch ? categoryMatch[1].trim() : undefined;
            
            // Try to extract original price for discount calculation
            const originalPriceMatch = match.match(/was[^>]*>(\d+)[,\s]*(\d+)?\s*kr/i) ||
                                       match.match(/tidigare[^>]*>(\d+)[,\s]*(\d+)?\s*kr/i);
            let originalPrice: number | undefined;
            if (originalPriceMatch) {
              originalPrice = parseFloat((originalPriceMatch[1] || originalPriceMatch[2] || '0').replace(/\s/g, ''));
            }

            deals.push({
              name,
              price,
              category,
              originalPrice,
              discount: originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
            });
          }
        }

        // Check if there are more pages
        const nextPagePattern = /<a[^>]*class="[^"]*next[^"]*"[^>]*>/i;
        hasMorePages = nextPagePattern.test(html);
        
        page++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMorePages = false;
      }
    }

    // Remove duplicates based on name and price
    const uniqueDeals = deals.filter((deal, index, self) =>
      index === self.findIndex((d) => d.name === deal.name && d.price === deal.price)
    );

    return NextResponse.json({ deals: uniqueDeals, count: uniqueDeals.length });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
