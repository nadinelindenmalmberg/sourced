import { NextResponse } from 'next/server';

export interface Deal {
  name: string;
  price: number;
  category?: string;
  originalPrice?: number;
  discount?: number;
}

// Mock data for testing when scraping fails
const MOCK_DEALS: Deal[] = [
  { name: 'Lövbiff', price: 89, category: 'Kött', originalPrice: 120, discount: 26 },
  { name: 'Laxfilé', price: 95, category: 'Fisk', originalPrice: 130, discount: 27 },
  { name: 'Kycklingfilé', price: 75, category: 'Kött', originalPrice: 95, discount: 21 },
  { name: 'Paprika', price: 15, category: 'Grönsaker' },
  { name: 'Gul Lök', price: 12, category: 'Grönsaker' },
  { name: 'Vitlök', price: 8, category: 'Grönsaker' },
  { name: 'Tomat', price: 18, category: 'Grönsaker' },
  { name: 'Gurka', price: 14, category: 'Grönsaker' },
  { name: 'Gräddfil', price: 22, category: 'Mejeri' },
  { name: 'Crème Fraîche', price: 24, category: 'Mejeri' },
  { name: 'Riven Ost', price: 35, category: 'Mejeri' },
  { name: 'Smör', price: 28, category: 'Mejeri' },
  { name: 'Mjölk', price: 16, category: 'Mejeri' },
  { name: 'Ägg', price: 32, category: 'Mejeri' },
  { name: 'Pasta', price: 18, category: 'Torrvaror' },
  { name: 'Ris', price: 25, category: 'Torrvaror' },
  { name: 'Tomatpuré', price: 12, category: 'Konserver' },
  { name: 'Krossade Tomater', price: 15, category: 'Konserver' },
  { name: 'Citron', price: 6, category: 'Frukt' },
  { name: 'Lime', price: 5, category: 'Frukt' },
  { name: 'Dill', price: 12, category: 'Kryddor' },
  { name: 'Basilika', price: 15, category: 'Kryddor' },
  { name: 'Taco Krydda', price: 18, category: 'Kryddor' },
  { name: 'Curry', price: 16, category: 'Kryddor' },
  { name: 'Rödvin', price: 85, category: 'Dryck' },
  { name: 'Öl', price: 22, category: 'Dryck' },
  { name: 'Banan', price: 20, category: 'Frukt' },
  { name: 'Äpple', price: 18, category: 'Frukt' },
  { name: 'Potatis', price: 12, category: 'Grönsaker' },
  { name: 'Morot', price: 14, category: 'Grönsaker' },
  { name: 'Broccoli', price: 22, category: 'Grönsaker' },
  { name: 'Blomkål', price: 20, category: 'Grönsaker' },
  { name: 'Champinjoner', price: 28, category: 'Grönsaker' },
  { name: 'Zucchini', price: 16, category: 'Grönsaker' },
  { name: 'Aubergine', price: 24, category: 'Grönsaker' },
  { name: 'Spenat', price: 19, category: 'Grönsaker' },
  { name: 'Ruccola', price: 25, category: 'Grönsaker' },
  { name: 'Fetaost', price: 42, category: 'Mejeri' },
  { name: 'Mozzarella', price: 38, category: 'Mejeri' },
  { name: 'Bacon', price: 45, category: 'Kött' },
  { name: 'Korv', price: 35, category: 'Kött' },
  { name: 'Färs', price: 55, category: 'Kött' },
  { name: 'Fläskfilé', price: 78, category: 'Kött' },
  { name: 'Räkor', price: 65, category: 'Fisk' },
  { name: 'Musslor', price: 48, category: 'Fisk' },
];

export async function GET() {
  const useMockData = process.env.USE_MOCK_DATA === 'true';
  
  // Return mock data if explicitly enabled
  if (useMockData) {
    console.log('Using mock data (USE_MOCK_DATA=true)');
    return NextResponse.json({ 
      deals: MOCK_DEALS, 
      count: MOCK_DEALS.length,
      source: 'mock'
    });
  }

  try {
    const deals: Deal[] = [];
    const baseUrl = 'https://www.hemkop.se';
    let page = 1;
    let hasMorePages = true;
    let pagesFetched = 0;

    // Non-food keywords to filter out
    const nonFoodKeywords = [
      'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
      'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
      'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare'
    ];

    while (hasMorePages && page <= 5) { // Reduced to 5 pages for faster testing
      try {
        const url = `${baseUrl}/kampanjer?page=${page}`;
        console.log(`Fetching page ${page}: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
          },
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          console.log(`Page ${page} returned status ${response.status}`);
          hasMorePages = false;
          break;
        }

        const html = await response.text();
        console.log(`Page ${page} fetched, HTML length: ${html.length}`);
        
        // Try multiple extraction patterns
        let matches: string[] = [];
        
        // Pattern 1: Look for product containers
        const productPattern = /<div[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
        matches = html.match(productPattern) || [];
        
        // Pattern 2: If no matches, try looking for data attributes
        if (matches.length === 0) {
          const dataPattern = /<[^>]*data-[^>]*product[^>]*>[\s\S]*?<\/[^>]*>/gi;
          matches = html.match(dataPattern) || [];
        }
        
        // Pattern 3: Look for any div with price information
        if (matches.length === 0) {
          const pricePattern = /<div[^>]*>[\s\S]{0,500}?\d+\s*kr[\s\S]{0,500}?<\/div>/gi;
          matches = html.match(pricePattern) || [];
        }

        console.log(`Found ${matches.length} potential product matches on page ${page}`);

        for (const match of matches) {
          // Extract name - try multiple patterns
          const nameMatch = match.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i) || 
                           match.match(/data-product-name="([^"]+)"/i) ||
                           match.match(/data-name="([^"]+)"/i) ||
                           match.match(/title="([^"]+)"/i) ||
                           match.match(/<a[^>]*>([^<]+)<\/a>/i);
          
          // Extract price - try multiple patterns
          const priceMatch = match.match(/(\d+)[,\s]*(\d+)?\s*kr/i) || 
                            match.match(/data-price="([^"]+)"/i) ||
                            match.match(/price[^>]*>([^<]+)</i) ||
                            match.match(/(\d+)[,\s]*(\d+)?\s*:-/i);
          
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
            
            if (isNonFood || price === 0 || price > 1000) continue; // Skip unrealistic prices

            const category = categoryMatch ? categoryMatch[1].trim() : undefined;
            
            // Try to extract original price for discount calculation
            const originalPriceMatch = match.match(/was[^>]*>(\d+)[,\s]*(\d+)?\s*kr/i) ||
                                       match.match(/tidigare[^>]*>(\d+)[,\s]*(\d+)?\s*kr/i) ||
                                       match.match(/före[^>]*>(\d+)[,\s]*(\d+)?\s*kr/i);
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

        pagesFetched++;
        
        // Check if there are more pages
        const nextPagePattern = /<a[^>]*class="[^"]*next[^"]*"[^>]*>/i;
        hasMorePages = nextPagePattern.test(html) && pagesFetched < 5;
        
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

    console.log(`Scraping completed: ${uniqueDeals.length} unique deals found from ${pagesFetched} pages`);

    // If we got no deals, fall back to mock data
    if (uniqueDeals.length === 0) {
      console.log('No deals found from scraping, falling back to mock data');
      return NextResponse.json({ 
        deals: MOCK_DEALS, 
        count: MOCK_DEALS.length,
        source: 'mock_fallback',
        warning: 'Scraping returned no results, using mock data for testing'
      });
    }

    return NextResponse.json({ 
      deals: uniqueDeals, 
      count: uniqueDeals.length,
      source: 'scraped',
      pagesFetched
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    
    // Fall back to mock data on error
    console.log('Falling back to mock data due to error');
    return NextResponse.json({ 
      deals: MOCK_DEALS, 
      count: MOCK_DEALS.length,
      source: 'mock_error_fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
