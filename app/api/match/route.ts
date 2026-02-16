import { NextRequest, NextResponse } from 'next/server';
import { matchRecipes, getPantrySample, RECIPES_COUNT } from '@/lib/recipe-matcher';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deals } = body;

    if (!deals || deals.length === 0) {
      return NextResponse.json(
        { error: 'Inga erbjudanden skickades' },
        { status: 400 }
      );
    }

    const recipes = matchRecipes(deals, { maxResults: 5, minDealMatches: 1 });

    return NextResponse.json({
      recipes,
      total_recipes_checked: RECIPES_COUNT,
      pantry_items_assumed: getPantrySample(20),
    });
  } catch (error) {
    console.error('Error matching recipes:', error);
    return NextResponse.json(
      {
        error: 'Kunde inte matcha recept',
        details: error instanceof Error ? error.message : 'Okänt fel',
      },
      { status: 500 }
    );
  }
}
