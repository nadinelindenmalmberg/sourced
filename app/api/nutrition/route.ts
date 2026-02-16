import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Livsmedelsverket API for Swedish food nutritional data
// Free, open data under CC BY 4.0 license
// Docs: https://dataportal.livsmedelsverket.se/livsmedel/swagger/index.html

interface LivsmedelsverketFood {
  nummer: number;
  namn: string;
  vetenskapligtNamn?: string;
  version: string;
  typ: string;
  tillagningsmetod?: string;
  naringsvarden?: Array<{
    namn: string;
    forkortning: string;
    varde: number;
    enhet: string;
  }>;
}

// Cache for food data to reduce API calls
let foodCache: LivsmedelsverketFood[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getFoodList(): Promise<LivsmedelsverketFood[]> {
  // Return cached data if valid
  if (foodCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return foodCache;
  }

  try {
    const response = await fetch('https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel', {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 24 hours
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      console.error('Livsmedelsverket API error:', response.status);
      return foodCache || [];
    }

    const data = await response.json();
    foodCache = data;
    cacheTimestamp = Date.now();
    
    return data;
  } catch (error) {
    console.error('Error fetching Livsmedelsverket data:', error);
    return foodCache || [];
  }
}

// Search food by name
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const id = searchParams.get('id');

  try {
    // Get specific food by ID
    if (id) {
      const response = await fetch(
        `https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel/${id}`,
        {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 86400 }
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Livsmedel hittades inte' },
          { status: 404 }
        );
      }

      const food = await response.json();
      return NextResponse.json({ food });
    }

    // Search by name
    if (!query) {
      return NextResponse.json(
        { error: 'Sökord krävs. Skicka ?q=kycklingfilé' },
        { status: 400 }
      );
    }

    const foods = await getFoodList();
    const searchLower = query.toLowerCase();
    
    // Search in food names
    const matches = foods
      .filter(food => 
        food.namn?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10)
      .map(food => ({
        id: food.nummer,
        name: food.namn,
        scientificName: food.vetenskapligtNamn,
        type: food.typ,
        cookingMethod: food.tillagningsmetod,
      }));

    return NextResponse.json({
      foods: matches,
      total: matches.length,
      query
    });

  } catch (error) {
    console.error('Livsmedelsverket search error:', error);
    return NextResponse.json(
      { error: 'Kunde inte söka i Livsmedelsverket' },
      { status: 500 }
    );
  }
}

// POST: Get nutrition for multiple foods
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { foodNames } = body;

    if (!foodNames || !Array.isArray(foodNames) || foodNames.length === 0) {
      return NextResponse.json(
        { error: 'foodNames array krävs' },
        { status: 400 }
      );
    }

    const foods = await getFoodList();
    
    const results = foodNames.map(name => {
      const searchLower = name.toLowerCase();
      const match = foods.find(food => 
        food.namn?.toLowerCase().includes(searchLower)
      );
      
      if (!match) {
        return { name, found: false, nutrition: null };
      }

      // Extract key nutrients if available
      const nutrients = match.naringsvarden || [];
      const keyNutrients = {
        energi: nutrients.find(n => n.forkortning === 'Ener')?.varde,
        protein: nutrients.find(n => n.forkortning === 'Prot')?.varde,
        kolhydrater: nutrients.find(n => n.forkortning === 'Kolh')?.varde,
        fett: nutrients.find(n => n.forkortning === 'Fett')?.varde,
        fiber: nutrients.find(n => n.forkortning === 'Fibe')?.varde,
      };

      return {
        name,
        found: true,
        id: match.nummer,
        matchedName: match.namn,
        nutrition: keyNutrients
      };
    });

    return NextResponse.json({
      results,
      foundCount: results.filter(r => r.found).length,
      totalSearched: foodNames.length
    });

  } catch (error) {
    console.error('Livsmedelsverket batch search error:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta näringsvärden' },
      { status: 500 }
    );
  }
}
