import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecipeRequest {
  ingredients: string[]; // Array of ingredient names
  deals?: Array<{
    name: string;
    promotion?: string;
    price?: number;
    unit?: string;
    category?: string;
  }>;
}

export interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  search_query: string;
}

export interface RecipeResponse {
  recipes: Recipe[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeRequest = await request.json();
    const { ingredients, deals } = body;

    if (!ingredients || ingredients.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 ingredients required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a professional Swedish chef and meal planner specializing in turning discounted groceries into great dinners.

Input: A list of discounted ingredients from Hemköp (often a mix of great cooking items and some fika/snacks).

Task: Create 3 distinct, budget-friendly recipe recommendations that feel like genuinely good ideas.

**Crucial:** 
- You may assume the user has basic pantry staples (salt, pepper, oil, flour, butter, sugar, vinegar).
- Each recipe should be practical and use Swedish cooking methods.
- Recipes should be distinct from each other (different cooking styles, cuisines, or meal types).
- Make the recipes budget-friendly and suitable for everyday cooking.
- Prefer “proper food” (protein + veg + carb) over snacks/dessert. If an ingredient is clearly fika (e.g. donuts), avoid centering a dinner on it.

**Output:** Return ONLY valid JSON matching this exact schema:
{
  "recipes": [
    {
      "title": "Recipe Name in Swedish",
      "ingredients": ["Ingredient 1 with quantity", "Ingredient 2 with quantity", ...],
      "instructions": ["Step 1", "Step 2", "Step 3", ...],
      "search_query": "Specific search query in Swedish to find similar recipes"
    }
  ]
}

The search_query should be a specific, descriptive query in Swedish that would help find similar recipes on Swedish recipe sites.`;

    const dealContext = Array.isArray(deals) && deals.length > 0
      ? `\n\nSale context (from Hemköp):\n${deals.map(d => `- ${d.name} (${d.promotion || ''}${d.price ? `, ca ${d.price} kr/${d.unit || ''}` : ''}${d.category ? `, kategori: ${d.category}` : ''})`).join('\n')}`
      : '';

    const userPrompt = `Create 3 distinct, creative recipes using these ingredients that are CURRENTLY ON SALE at Hemköp:

${ingredients.map((ing, i) => `${i + 1}. ${ing} (ON SALE - use this prominently!)`).join('\n')}

Requirements:
- These ingredients are discounted/on sale - make recipes that highlight their value
- Each recipe should be unique (different meal types: breakfast, lunch, dinner, or different cuisines)
- Make them practical, budget-friendly, and delicious
- Use the sale ingredients as the main stars of each dish
- Be creative but realistic for Swedish home cooking

Make sure each recipe is distinct and uses different cooking techniques or styles.${dealContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      
      // Handle both formats: { recipes: [...] } or direct array
      let recipes: Recipe[] = [];
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        recipes = parsed.recipes;
      } else if (Array.isArray(parsed)) {
        recipes = parsed;
      } else {
        return NextResponse.json(
          { error: 'Invalid response format from OpenAI' },
          { status: 500 }
        );
      }

      // Validate and clean recipes
      const validRecipes: Recipe[] = recipes
        .filter((r: any) => r.title && r.ingredients && r.instructions)
        .map((r: any) => ({
          title: r.title || 'Namnlöst Recept',
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          instructions: Array.isArray(r.instructions) ? r.instructions : [],
          search_query: r.search_query || r.title || '',
        }))
        .slice(0, 3); // Ensure max 3 recipes

      if (validRecipes.length === 0) {
        return NextResponse.json(
          { error: 'No valid recipes generated' },
          { status: 500 }
        );
      }

      return NextResponse.json({ recipes: validRecipes });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', content);
      return NextResponse.json(
        { error: 'Failed to parse recipe response', details: content.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating recipes:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
