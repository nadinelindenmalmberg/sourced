import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Spoonacular API for ingredient-based recipe search
// Free tier: 150 requests/day
// Docs: https://spoonacular.com/food-api/docs

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: Array<{
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
  }>;
  usedIngredients: Array<{
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
  }>;
  likes: number;
}

interface RecipeDetails {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  instructions: string;
  extendedIngredients: Array<{
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
  }>;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'Spoonacular API-nyckel saknas',
        hint: 'Skapa ett gratis konto på spoonacular.com och lägg till SPOONACULAR_API_KEY i .env.local'
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const ingredients = searchParams.get('ingredients');
  const cuisine = searchParams.get('cuisine') || 'nordic';
  const number = searchParams.get('number') || '5';

  if (!ingredients) {
    return NextResponse.json(
      { error: 'Ingredienser krävs. Skicka ?ingredients=chicken,rice,tomato' },
      { status: 400 }
    );
  }

  try {
    // Search recipes by ingredients
    const searchUrl = new URL('https://api.spoonacular.com/recipes/findByIngredients');
    searchUrl.searchParams.set('apiKey', apiKey);
    searchUrl.searchParams.set('ingredients', ingredients);
    searchUrl.searchParams.set('number', number);
    searchUrl.searchParams.set('ranking', '2'); // Maximize used ingredients
    searchUrl.searchParams.set('ignorePantry', 'true');

    console.log('Searching Spoonacular for:', ingredients);

    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Spoonacular search error:', searchResponse.status, errorText);
      return NextResponse.json(
        { error: `Spoonacular API fel: ${searchResponse.status}` },
        { status: searchResponse.status }
      );
    }

    const recipes: SpoonacularRecipe[] = await searchResponse.json();

    if (recipes.length === 0) {
      return NextResponse.json({
        recipes: [],
        message: 'Inga recept hittades för dessa ingredienser'
      });
    }

    // Get detailed info for top recipes
    const recipeIds = recipes.slice(0, 3).map(r => r.id).join(',');
    const detailsUrl = new URL('https://api.spoonacular.com/recipes/informationBulk');
    detailsUrl.searchParams.set('apiKey', apiKey);
    detailsUrl.searchParams.set('ids', recipeIds);

    const detailsResponse = await fetch(detailsUrl.toString());
    
    if (!detailsResponse.ok) {
      // Return basic info if details fail
      return NextResponse.json({
        recipes: recipes.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          image: r.image,
          usedIngredients: r.usedIngredients.map(i => i.name),
          missedIngredients: r.missedIngredients.map(i => i.name),
        })),
        detailed: false
      });
    }

    const details: RecipeDetails[] = await detailsResponse.json();

    // Map to our format
    const formattedRecipes = details.map(recipe => {
      const steps = recipe.analyzedInstructions?.[0]?.steps || [];
      
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        time_minutes: recipe.readyInMinutes,
        servings: recipe.servings,
        source_url: recipe.sourceUrl,
        cuisines: recipe.cuisines,
        ingredients: recipe.extendedIngredients.map(i => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit,
          original: i.original
        })),
        instructions: steps.map(s => s.step),
        summary: recipe.summary?.replace(/<[^>]*>/g, '') || '', // Strip HTML
      };
    });

    return NextResponse.json({
      recipes: formattedRecipes,
      total: recipes.length,
      detailed: true
    });

  } catch (error) {
    console.error('Spoonacular API error:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta recept från Spoonacular' },
      { status: 500 }
    );
  }
}

// POST: Search with more options
export async function POST(request: NextRequest) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Spoonacular API-nyckel saknas' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { ingredients, cuisine = 'nordic', diet, maxReadyTime, number = 5 } = body;

    // Complex search with more filters
    const searchUrl = new URL('https://api.spoonacular.com/recipes/complexSearch');
    searchUrl.searchParams.set('apiKey', apiKey);
    
    if (ingredients && ingredients.length > 0) {
      searchUrl.searchParams.set('includeIngredients', ingredients.join(','));
    }
    if (cuisine) {
      searchUrl.searchParams.set('cuisine', cuisine);
    }
    if (diet) {
      searchUrl.searchParams.set('diet', diet);
    }
    if (maxReadyTime) {
      searchUrl.searchParams.set('maxReadyTime', maxReadyTime.toString());
    }
    
    searchUrl.searchParams.set('number', number.toString());
    searchUrl.searchParams.set('addRecipeInformation', 'true');
    searchUrl.searchParams.set('fillIngredients', 'true');
    searchUrl.searchParams.set('instructionsRequired', 'true');

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Spoonacular API fel: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      recipes: data.results || [],
      total: data.totalResults || 0
    });

  } catch (error) {
    console.error('Spoonacular API error:', error);
    return NextResponse.json(
      { error: 'Kunde inte söka recept' },
      { status: 500 }
    );
  }
}
