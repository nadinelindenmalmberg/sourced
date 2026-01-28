import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecipeRequest {
  ingredients: Array<{
    name: string;
    price: number;
  }>;
}

export interface RecipeResponse {
  recipe_title: string;
  ingredients_used: string[];
  omitted_ingredients: string[];
  instructions: string[];
  search_query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeRequest = await request.json();
    const { ingredients } = body;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients provided' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Identify the main ingredient (usually the most expensive one)
    const sortedIngredients = [...ingredients].sort((a, b) => b.price - a.price);
    const mainIngredient = sortedIngredients[0];
    const otherIngredients = sortedIngredients.slice(1);

    const systemPrompt = `You are a creative Swedish chef.

Input: A list of random discounted ingredients from Hemköp.

Task: Create 1 creative recipe that uses the **Main Ingredient** (usually the most expensive one: ${mainIngredient.name}) and incorporates the others if possible.

**Constraint:** If a randomly selected ingredient truly does not fit (e.g., 'Vanilla Sauce' with 'Salmon'), you are allowed to **omit it** and mention in the notes: 'Skipped [Item] as it didn't fit the flavor profile.'

**Pantry:** Assume standard pantry staples (Oil, Butter, Soy Sauce, Spices, Flour, Rice/Pasta, Salt, Pepper, Garlic, Onion).

**Output Format:** Return a valid JSON object with the following structure:
{
  "recipe_title": "Creative recipe name in Swedish",
  "ingredients_used": ["list", "of", "ingredients", "actually", "used"],
  "omitted_ingredients": ["list", "of", "ingredients", "omitted", "if", "any"],
  "instructions": ["Step 1", "Step 2", "Step 3", ...],
  "search_query": "Google search query for similar recipes"
}

Make the recipe practical, delicious, and suitable for Swedish home cooking.`;

    const userPrompt = `Create a recipe using these ingredients:
Main: ${mainIngredient.name} (${mainIngredient.price} SEK)
Others: ${otherIngredients.map(i => `${i.name} (${i.price} SEK)`).join(', ')}`;

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
      const recipe: RecipeResponse = JSON.parse(content);
      
      // Validate and ensure arrays are arrays
      if (!Array.isArray(recipe.ingredients_used)) {
        recipe.ingredients_used = [];
      }
      if (!Array.isArray(recipe.omitted_ingredients)) {
        recipe.omitted_ingredients = [];
      }
      if (!Array.isArray(recipe.instructions)) {
        recipe.instructions = [recipe.instructions || ''];
      }

      return NextResponse.json(recipe);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse recipe response', details: content },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
