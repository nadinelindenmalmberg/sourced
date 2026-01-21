/**
 * Browse AI Products API
 * 
 * Fetches products on sale from Hemköp using Browse AI.
 * Returns product data in Hemköp's format with images, prices, and dates.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.BROWSE_AI_API_KEY;
  const robotId = process.env.BROWSE_AI_ROBOT_ID;

  if (!apiKey || !robotId) {
    console.log('Browse AI: No API keys configured');
    return NextResponse.json({ 
      success: false,
      error: 'API keys not configured',
      products: [] 
    });
  }

  try {
    console.log(`Browse AI: Fetching from robot ${robotId}`);
    
    const response = await fetch(`https://api.browse.ai/v2/robots/${robotId}/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Browse AI API error: ${response.status}`, errorBody);
      throw new Error(`Browse AI API error: ${response.status}`);
    }

    const data = await response.json();
    const tasks = data.result?.robotTasks?.items || [];
    
    if (tasks.length === 0 || !tasks[0].capturedLists) {
      return NextResponse.json({ 
        success: false,
        error: 'No data available',
        products: [] 
      });
    }

    const latestTask = tasks[0];
    const capturedProductsRaw = Object.values(latestTask.capturedLists)[0];
    const capturedProducts = Array.isArray(capturedProductsRaw) ? capturedProductsRaw : [];
    
    console.log(`Browse AI: Processing ${capturedProducts.length} products`);

    // Transform Browse AI data to match Hemköp format
    const products = capturedProducts.map((item: any, index: number) => {
      const lowestPriceStr = item['Lowest 30-Day Price'] || '0';
      const lowestPriceNumeric = parseFloat(lowestPriceStr.replace(/[^\d.,]/g, '').replace(',', '.'));
      const priceStr = item['Price per Unit'] || '0';
      const priceText = priceStr.toString().trim();
      
      // Parse price - handle formats like "10,00 /st" or "2 för 30 kr"
      let displayPrice = priceText;
      let numericPrice = 0;
      
      if (priceText.includes('för')) {
        // Multi-buy format: "2 för 30 kr"
        displayPrice = priceText.replace(/\n/g, ' ');
        const match = priceText.match(/(\d+)\s*för\s*([\d,]+)/);
        if (match) {
          numericPrice = parseFloat(match[2].replace(',', '.'));
        }
      } else {
        // Regular format: "10,00 /st"
        displayPrice = priceText.replace(/\n/g, ' ');
        numericPrice = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
      }
      
      return {
        id: String(index + 1),
        name: item['Product Name'] || 'Unknown',
        brand: item['Brand and Volume'] || '',
        price: numericPrice,
        lowestPrice: lowestPriceNumeric,  // As a number
        lowestPriceDisplay: lowestPriceStr,  // Original string format
        priceDisplay: displayPrice,
        image: item['Image'] || null,
        imageAlt: item['Image Alt Text'] || item['Product Name'] || '',
        endDate: item['End Date'] || '',
      };
    });

    console.log(`Browse AI: Successfully fetched ${products.length} products`);
    
    return NextResponse.json({ 
      success: true,
      products
    });

  } catch (error) {
    console.error('Browse AI error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch',
      products: [] 
    });
  }
}
