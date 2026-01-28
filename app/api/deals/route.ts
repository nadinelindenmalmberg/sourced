import { NextResponse } from 'next/server';

export interface Deal {
  name: string;
  price: number;
  category?: string;
  originalPrice?: number;
  discount?: number;
}

// Try to use Puppeteer if available, otherwise fall back to fetch
// Load dynamically to avoid build-time issues
async function getPuppeteer() {
  try {
    return await import('puppeteer');
  } catch (e) {
    return null;
  }
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
    
    // Non-food keywords to filter out
    const nonFoodKeywords = [
      'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
      'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
      'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare'
    ];

    // Try Puppeteer first if available
    const puppeteerModule = await getPuppeteer();
    if (puppeteerModule) {
      console.log('Using Puppeteer to scrape Hemköp...');
      const browser = await puppeteerModule.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Try different URL patterns
        const urlsToTry = [
          'https://www.hemkop.se/erbjudanden',
          'https://www.hemkop.se/artikel/alltid-bra-pris',
          'https://www.hemkop.se/handla',
        ];
        
        for (const url of urlsToTry) {
          try {
            console.log(`Trying URL: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for content to load
            await page.waitForTimeout(3000);
            
            // Try to intercept network requests to find API calls
            const apiCalls: string[] = [];
            page.on('response', (response: any) => {
              const url = response.url();
              if (url.includes('api') || url.includes('product') || url.includes('offer') || url.includes('erbjudande')) {
                apiCalls.push(url);
              }
            });
            
            // Wait a bit for API calls to happen
            await page.waitForTimeout(2000);
            
            // Try to extract product data from the page
            const pageDeals = await page.evaluate((nonFoodKeywords: string[]) => {
              const deals: any[] = [];
              
              // Strategy 1: Look for product cards/containers
              const productSelectors = [
                '[data-testid*="product"]',
                '[class*="product-card"]',
                '[class*="ProductCard"]',
                '[class*="product-item"]',
                '[class*="ProductItem"]',
                'article[class*="product"]',
                '[class*="offer"]',
                '[class*="deal"]',
              ];
              
              let productElements: Element[] = [];
              for (const selector of productSelectors) {
                try {
                  const found = Array.from(document.querySelectorAll(selector));
                  if (found.length > 2) { // Need at least a few to be confident
                    productElements = found;
                    console.log(`Found ${found.length} elements with selector: ${selector}`);
                    break;
                  }
                } catch (e) {
                  // Selector might be invalid, continue
                }
              }
              
              // Strategy 2: Look for elements containing both name and price
              if (productElements.length === 0) {
                const allDivs = Array.from(document.querySelectorAll('div, article, section'));
                productElements = allDivs.filter(el => {
                  const text = el.textContent || '';
                  const hasPrice = /\d+[,\s]*\d*\s*kr/i.test(text);
                  const hasName = text.length > 10 && text.length < 300;
                  const childCount = el.children.length;
                  // Likely a product card if it has price, reasonable text length, and some structure
                  return hasPrice && hasName && (childCount > 0 || el.querySelector('img'));
                });
              }
              
              console.log(`Found ${productElements.length} potential product elements`);
              
              for (const element of productElements.slice(0, 150)) {
                try {
                  const text = element.textContent || '';
                  const innerHTML = element.innerHTML || '';
                  
                  // Extract name - try multiple strategies
                  let name = '';
                  const nameSelectors = [
                    'h1', 'h2', 'h3', 'h4',
                    '[class*="name"]', '[class*="title"]', '[class*="Name"]', '[class*="Title"]',
                    '[class*="product-name"]', '[class*="product-title"]',
                    'a[href*="product"]', 'a[href*="artikel"]',
                  ];
                  
                  for (const selector of nameSelectors) {
                    const nameEl = element.querySelector(selector);
                    if (nameEl) {
                      const candidateName = (nameEl.textContent || '').trim();
                      if (candidateName.length > 3 && candidateName.length < 80) {
                        name = candidateName.split('\n')[0].split('|')[0].trim();
                        break;
                      }
                    }
                  }
                  
                  // Fallback: use first substantial text line
                  if (!name || name.length < 3) {
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 80);
                    if (lines.length > 0) {
                      name = lines[0];
                    }
                  }
                  
                  // Extract price - look for "XX kr" or "XX:-" patterns
                  const pricePatterns = [
                    /(\d+)[,\s]*(\d+)?\s*kr/i,
                    /(\d+)[,\s]*(\d+)?\s*:-/i,
                    /(\d+)[,\s]*(\d+)?\s*SEK/i,
                  ];
                  
                  let priceMatch = null;
                  for (const pattern of pricePatterns) {
                    priceMatch = text.match(pattern);
                    if (priceMatch) break;
                  }
                  
                  if (name && name.length > 2 && priceMatch) {
                    const priceStr = priceMatch[1] || priceMatch[2];
                    const price = parseFloat(priceStr?.replace(/\s/g, '') || '0');
                    
                    // Skip if it's a non-food item
                    const isNonFood = nonFoodKeywords.some((keyword: string) => 
                      name.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    // Validate price is reasonable
                    if (!isNonFood && price > 0 && price < 1000 && name.length > 2) {
                      // Extract category from parent containers or data attributes
                      let category: string | undefined;
                      const categoryEl = element.closest('[class*="category"], [class*="Category"], [data-category]');
                      if (categoryEl) {
                        category = (categoryEl.getAttribute('data-category') || categoryEl.textContent || '').trim().substring(0, 50);
                      }
                      
                      // Extract original price for discount calculation
                      const originalPricePatterns = [
                        /(?:tidigare|före|was|förut|ursprungligt)\s*:?\s*(\d+)[,\s]*(\d+)?\s*kr/i,
                        /(\d+)[,\s]*(\d+)?\s*kr\s*→\s*(\d+)[,\s]*(\d+)?\s*kr/i, // "120 kr → 89 kr"
                      ];
                      
                      let originalPrice: number | undefined;
                      for (const pattern of originalPricePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                          originalPrice = parseFloat((match[1] || match[2] || match[3] || match[4] || '0').replace(/\s/g, ''));
                          if (originalPrice > price) break;
                        }
                      }
                      
                      // Avoid duplicates
                      const isDuplicate = deals.some(d => d.name === name && d.price === price);
                      if (!isDuplicate) {
                        deals.push({
                          name: name.substring(0, 100),
                          price,
                          category,
                          originalPrice,
                          discount: originalPrice && originalPrice > price ? 
                            Math.round(((originalPrice - price) / originalPrice) * 100) : undefined,
                        });
                      }
                    }
                  }
                } catch (e) {
                  // Skip this element if there's an error
                  continue;
                }
              }
              
              console.log(`Extracted ${deals.length} deals from page`);
              return deals;
            }, nonFoodKeywords);
            
            // If we found API calls, try to fetch from them
            if (apiCalls.length > 0 && pageDeals.length === 0) {
              console.log(`Found ${apiCalls.length} potential API endpoints:`, apiCalls.slice(0, 5));
              // Could try to fetch from these endpoints, but they might require auth
            }
            
            if (pageDeals.length > 0) {
              console.log(`Found ${pageDeals.length} deals from ${url}`);
              deals.push(...pageDeals);
              break; // Success, stop trying other URLs
            }
          } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            continue;
          }
        }
        
        await browser.close();
      } catch (error) {
        console.error('Puppeteer error:', error);
        await browser.close();
      }
    }
    
    // Try to find API endpoints
    if (deals.length === 0) {
      console.log('Trying to find API endpoints...');
      const apiEndpoints = [
        'https://www.hemkop.se/api/products',
        'https://www.hemkop.se/api/offers',
        'https://www.hemkop.se/api/erbjudanden',
        'https://www.hemkop.se/api/kampanjer',
        'https://api.hemkop.se/products',
        'https://api.hemkop.se/offers',
      ];
      
      for (const apiUrl of apiEndpoints) {
        try {
          const response = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(5000),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Found API endpoint: ${apiUrl}`);
            // Process API response (structure may vary)
            if (Array.isArray(data)) {
              deals.push(...data.map((item: any) => ({
                name: item.name || item.title || item.productName,
                price: item.price || item.currentPrice,
                category: item.category,
                originalPrice: item.originalPrice || item.oldPrice,
              })).filter((d: any) => d.name && d.price));
            } else if (data.products || data.items || data.deals) {
              const items = data.products || data.items || data.deals;
              deals.push(...items.map((item: any) => ({
                name: item.name || item.title || item.productName,
                price: item.price || item.currentPrice,
                category: item.category,
                originalPrice: item.originalPrice || item.oldPrice,
              })).filter((d: any) => d.name && d.price));
            }
            if (deals.length > 0) break;
          }
        } catch (error) {
          // API endpoint doesn't exist or requires auth, continue
        }
      }
    }
    
    // Fallback: Try fetch with different URL patterns and extract structured data
    if (deals.length === 0) {
      console.log('Trying fetch method with structured data extraction...');
      const baseUrl = 'https://www.hemkop.se';
      const urlsToTry = [
        `${baseUrl}/erbjudanden`,
        `${baseUrl}/artikel/alltid-bra-pris`,
      ];
      
      for (const url of urlsToTry) {
        try {
          console.log(`Trying fetch: ${url}`);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
          });

          if (response.ok) {
            const html = await response.text();
            console.log(`Fetched ${url}, HTML length: ${html.length}`);
            
            // Try to find JSON-LD structured data
            const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
            for (const jsonLd of jsonLdMatches) {
              try {
                const jsonContent = jsonLd.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
                if (jsonContent) {
                  const data = JSON.parse(jsonContent);
                  if (data['@type'] === 'Product' || Array.isArray(data)) {
                    console.log('Found JSON-LD structured data');
                    // Extract products from JSON-LD
                  }
                }
              } catch (e) {
                // Not valid JSON, continue
              }
            }
            
            // Try to find embedded JSON data in script tags
            const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
            for (const script of scriptMatches) {
              // Look for window.__INITIAL_STATE__ or similar
              const stateMatch = script.match(/window\.__[A-Z_]+__\s*=\s*(\{[\s\S]{100,10000}\});/);
              if (stateMatch) {
                try {
                  const state = JSON.parse(stateMatch[1]);
                  console.log('Found initial state data');
                  // Try to extract products from state
                  const extractProducts = (obj: any, path: string[] = []): any[] => {
                    if (Array.isArray(obj)) {
                      return obj.filter(item => item && typeof item === 'object' && (item.name || item.price));
                    }
                    if (obj && typeof obj === 'object') {
                      for (const [key, value] of Object.entries(obj)) {
                        if (key.toLowerCase().includes('product') || key.toLowerCase().includes('offer')) {
                          if (Array.isArray(value)) {
                            return value;
                          }
                        }
                        const found = extractProducts(value, [...path, key]);
                        if (found.length > 0) return found;
                      }
                    }
                    return [];
                  };
                  const foundProducts = extractProducts(state);
                  if (foundProducts.length > 0) {
                    deals.push(...foundProducts.map((item: any) => ({
                      name: item.name || item.title || item.productName || item.label,
                      price: item.price || item.currentPrice || item.salePrice,
                      category: item.category || item.categoryName,
                      originalPrice: item.originalPrice || item.oldPrice || item.regularPrice,
                    })).filter((d: any) => d.name && d.price && d.price > 0 && d.price < 1000));
                  }
                } catch (e) {
                  // Not valid JSON, continue
                }
              }
            }
            
            if (deals.length > 0) break;
          }
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
    }

    // Remove duplicates based on name and price
    const uniqueDeals = deals.filter((deal, index, self) =>
      index === self.findIndex((d) => d.name === deal.name && d.price === deal.price)
    );

    console.log(`Scraping completed: ${uniqueDeals.length} unique deals found`);

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
      source: 'scraped'
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
