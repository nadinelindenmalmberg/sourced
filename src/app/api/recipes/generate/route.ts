/**
 * Recipe Generation API
 * 
 * Generates recipe suggestions with links using OpenAI.
 * Returns recipes with direct links to recipe websites.
 */

import { NextRequest, NextResponse } from 'next/server';

/** Demo recipes for development and fallback */
const DEMO_RECIPES = [
  { 
    title: 'Köttfärssås', 
    description: 'Klassisk köttfärssås med pasta', 
    matchedProducts: ['Nötfärs', 'Krossade tomater', 'Pasta'],
    link: 'https://www.ica.se/recept/koettfaerssas/'
  },
  { 
    title: 'Kycklingwok', 
    description: 'Snabb wok med kyckling', 
    matchedProducts: ['Kycklingfilé'],
    link: 'https://www.ica.se/recept/kycklingwok/'
  },
  { 
    title: 'Lax med potatis', 
    description: 'Ugnsbakad lax med rostad potatis', 
    matchedProducts: ['Laxfilé', 'Potatis'],
    link: 'https://www.ica.se/recept/ugnsbakad-lax/'
  },
];

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;

    // Return demo recipes if no API key
    if (!apiKey) {
      console.log('OpenAI: No API key configured, using demo recipes');
      return NextResponse.json({ 
        success: true, 
        demo: true,
        recipes: DEMO_RECIPES 
      });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ 
        success: true, 
        recipes: [] 
      });
    }

    console.log(`OpenAI: Generating recipes for ${products.length} products`);

    // Create product list for the prompt
    const productNames = products.map((p: any) => p.name).join(', ');
    
    // Call OpenAI with request for recipe links
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful Swedish chef assistant. You create practical recipes and provide links to popular Swedish recipe websites like ica.se, arla.se, or coop.se.'
          },
          {
            role: 'user',
            content: `Generate 3 creative recipe suggestions using these ingredients that are on sale: ${productNames}

For each recipe, provide:
1. A catchy Swedish recipe name
2. A brief one-sentence description
3. Which of the sale products are used
4. A link to a similar recipe on ICA.se, Arla.se, or Coop.se (use real recipe URLs)

Format as JSON:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "matchedProducts": ["Product 1", "Product 2"],
      "link": "https://www.ica.se/recept/recipe-url/"
    }
  ]
}

Keep recipes simple and practical for Swedish home cooks.`
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status}`, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    let recipes;
    try {
      const parsed = JSON.parse(content);
      recipes = parsed.recipes || parsed;
      
      // Ensure it's an array
      if (!Array.isArray(recipes)) {
        recipes = [recipes];
      }

      // Validate recipe format
      recipes = recipes.map((recipe: any) => ({
        title: recipe.title || 'Recept',
        description: recipe.description || '',
        matchedProducts: Array.isArray(recipe.matchedProducts) ? recipe.matchedProducts : [],
        link: recipe.link || `https://www.google.com/search?q=${encodeURIComponent(recipe.title + ' recept')}`
      }));

    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse recipe suggestions');
    }

    console.log(`OpenAI: Successfully generated ${recipes.length} recipes with links`);

    return NextResponse.json({ 
      success: true, 
      recipes 
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json({ 
      success: true,
      demo: true,
      error: error instanceof Error ? error.message : 'Failed to generate recipes',
      recipes: DEMO_RECIPES 
    });
  }
}
