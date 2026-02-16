import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateRecipeContext, SWEDISH_RECIPE_CONTEXT } from '@/lib/recipe-context';

export const dynamic = 'force-dynamic';

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI API key not configured');
  }
  return new OpenAI({ apiKey: key });
}

export interface RecipeRequest {
  ingredients: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'varied';
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
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_minutes: number;
  servings: number;
  ingredients: Array<{
    item: string;
    amount: string;
    from_deal?: boolean;
  }>;
  instructions: string[];
  tips?: string;
  search_query: string;
}

export interface RecipeResponse {
  recipes: Recipe[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RecipeRequest = await request.json();
    const { ingredients, difficulty = 'varied', deals } = body;

    if (!ingredients || ingredients.length < 2) {
      return NextResponse.json(
        { error: 'Minst 2 ingredienser krävs' },
        { status: 400 }
      );
    }

    let openai: OpenAI;
    try {
      openai = getOpenAI();
    } catch (e) {
      return NextResponse.json(
        { error: 'OpenAI API-nyckel saknas. Sätt OPENAI_API_KEY i .env.local.' },
        { status: 500 }
      );
    }

    // Generate rich context for the AI
    const recipeContext = generateRecipeContext(ingredients, difficulty);

    const systemPrompt = `Du är en erfaren svensk hemmakock som skapar praktiska, goda vardagsrecept.

${SWEDISH_RECIPE_CONTEXT}

VIKTIGT:
- Skriv ALLTID på svenska
- Ge EXAKTA mängder (t.ex. "400g kycklingfilé", "2 dl grädde", "1 msk smör")
- Ge EXAKTA tider (t.ex. "stek i 5 minuter", "koka i 20 minuter")
- Ge temperaturer när relevant (t.ex. "175°C ugn", "medelhög värme")
- Recepten ska vara REALISTISKA - sådant folk faktiskt lagar
- Använd kampanjvarorna som huvudingredienser

OUTPUT FORMAT - returnera EXAKT denna JSON-struktur:
{
  "recipes": [
    {
      "title": "Receptnamn",
      "description": "En mening som beskriver rätten",
      "difficulty": "easy|medium|hard",
      "time_minutes": 30,
      "servings": 4,
      "ingredients": [
        {"item": "Kycklingfilé", "amount": "400g", "from_deal": true},
        {"item": "Grädde", "amount": "2 dl", "from_deal": false},
        {"item": "Salt", "amount": "1 tsk", "from_deal": false}
      ],
      "instructions": [
        "Skär kycklingen i bitar och krydda med salt och peppar.",
        "Hetta upp smör i en stekpanna på medelhög värme.",
        "Stek kycklingen i 5-6 minuter tills den är genomstekt."
      ],
      "tips": "Servera med ris eller pasta.",
      "search_query": "kycklinggryta grädde recept"
    }
  ]
}`;

    const dealInfo = deals && deals.length > 0
      ? `\n\nKAMPANJINFO:\n${deals.map(d => `- ${d.name}: ${d.promotion || `${d.price} kr`}`).join('\n')}`
      : '';

    const userPrompt = `${recipeContext}${dealInfo}

Skapa exakt 3 olika recept. Varje recept ska:
1. Använda minst 2 av kampanjvarorna som huvudingredienser
2. Vara olika typer av rätter (variation!)
3. Ha tydliga, konkreta instruktioner
4. Markera vilka ingredienser som kommer från kampanjen (from_deal: true)

Returnera ENDAST giltig JSON enligt formatet ovan.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Inget svar från AI' },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);

      let recipes: Recipe[] = [];
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        recipes = parsed.recipes;
      } else if (Array.isArray(parsed)) {
        recipes = parsed;
      } else {
        return NextResponse.json(
          { error: 'Ogiltigt svarsformat från AI' },
          { status: 500 }
        );
      }

      // Validate and clean recipes
      const validRecipes: Recipe[] = recipes
        .filter((r: any) => r.title && r.ingredients && r.instructions)
        .map((r: any) => ({
          title: r.title || 'Namnlöst Recept',
          description: r.description || '',
          difficulty: r.difficulty || 'medium',
          time_minutes: r.time_minutes || 30,
          servings: r.servings || 4,
          ingredients: Array.isArray(r.ingredients) 
            ? r.ingredients.map((i: any) => ({
                item: typeof i === 'string' ? i : i.item || i.name || '',
                amount: typeof i === 'string' ? '' : i.amount || i.quantity || '',
                from_deal: i.from_deal || false
              }))
            : [],
          instructions: Array.isArray(r.instructions) ? r.instructions : [],
          tips: r.tips || null,
          search_query: r.search_query || r.title || '',
        }))
        .slice(0, 3);

      if (validRecipes.length === 0) {
        return NextResponse.json(
          { error: 'Inga giltiga recept genererades' },
          { status: 500 }
        );
      }

      return NextResponse.json({ recipes: validRecipes });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', content);
      return NextResponse.json(
        { error: 'Kunde inte tolka receptsvaret', details: content.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating recipes:', error);
    return NextResponse.json(
      { error: 'Kunde inte generera recept', details: error instanceof Error ? error.message : 'Okänt fel' },
      { status: 500 }
    );
  }
}
