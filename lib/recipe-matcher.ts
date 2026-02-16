import type { DealMatchInput, MatchedRecipe, Recipe } from '@/types';
import recipesData from '@/data/recipes.json';
import pantryData from '@/data/pantry.json';

const recipes = recipesData.recipes as Recipe[];

/**
 * Normalize string for fuzzy matching (Swedish chars, trim).
 */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .trim();
}

/**
 * Check if a deal name matches an ingredient (fuzzy).
 */
export function dealMatchesIngredient(dealName: string, ingredient: string): boolean {
  const normalizedDeal = normalize(dealName);
  const normalizedIngredient = normalize(ingredient);

  if (normalizedDeal.includes(normalizedIngredient)) return true;
  if (normalizedIngredient.includes(normalizedDeal)) return true;

  const dealWords = normalizedDeal.split(/\s+/);
  const ingredientWords = normalizedIngredient.split(/\s+/);

  for (const dealWord of dealWords) {
    for (const ingredientWord of ingredientWords) {
      if (dealWord.length > 2 && ingredientWord.length > 2) {
        if (dealWord.includes(ingredientWord) || ingredientWord.includes(dealWord)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if ingredient is in the pantry staples list.
 */
export function isPantryItem(ingredient: string): boolean {
  const normalizedIngredient = normalize(ingredient);
  return pantryData.all_items_flat.some((item) => {
    const normalizedItem = normalize(item);
    return (
      normalizedIngredient.includes(normalizedItem) ||
      normalizedItem.includes(normalizedIngredient)
    );
  });
}

/**
 * Score one recipe against available deals; returns recipe with match metadata.
 */
export function scoreRecipe(recipe: Recipe, deals: DealMatchInput[]): MatchedRecipe {
  const matchedDeals: string[] = [];
  const missingIngredients: string[] = [];
  const pantryIngredients: string[] = [];

  for (const keyIng of recipe.key_ingredients) {
    const matchingDeal = deals.find((d) => dealMatchesIngredient(d.name, keyIng));
    if (matchingDeal) {
      if (!matchedDeals.includes(matchingDeal.name)) matchedDeals.push(matchingDeal.name);
    } else if (isPantryItem(keyIng)) {
      pantryIngredients.push(keyIng);
    } else {
      missingIngredients.push(keyIng);
    }
  }

  for (const ing of recipe.all_ingredients) {
    if (ing.pantry) {
      if (!pantryIngredients.includes(ing.name)) pantryIngredients.push(ing.name);
      continue;
    }
    const matchingDeal = deals.find((d) => dealMatchesIngredient(d.name, ing.name));
    if (matchingDeal && !matchedDeals.includes(matchingDeal.name)) {
      matchedDeals.push(matchingDeal.name);
    }
  }

  const keyMatches = matchedDeals.length;
  const missingPenalty = missingIngredients.length * 2;
  const score = keyMatches * 10 + matchedDeals.length - missingPenalty;

  const totalKey = recipe.key_ingredients.length;
  const coveredKey =
    matchedDeals.length +
    pantryIngredients.filter((p) =>
      recipe.key_ingredients.some((k) => dealMatchesIngredient(k, p))
    ).length;
  const matchPercentage = totalKey > 0 ? Math.round((coveredKey / totalKey) * 100) : 0;

  return {
    ...recipe,
    match_score: score,
    matched_deals: matchedDeals,
    missing_ingredients: missingIngredients,
    pantry_ingredients: pantryIngredients,
    match_percentage: matchPercentage,
  };
}

export interface MatchRecipesOptions {
  maxResults?: number;
  minDealMatches?: number;
}

/**
 * Match deals against the recipe database and return top scored recipes.
 */
export function matchRecipes(
  deals: DealMatchInput[],
  options: MatchRecipesOptions = {}
): MatchedRecipe[] {
  const { maxResults = 5, minDealMatches = 1 } = options;

  if (!deals || deals.length === 0) return [];

  const scored = recipes.map((recipe) => scoreRecipe(recipe, deals));
  const withMatches = scored.filter((r) => r.matched_deals.length >= minDealMatches);

  const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

  withMatches.sort((a, b) => {
    if (b.match_score !== a.match_score) return b.match_score - a.match_score;
    if (a.missing_ingredients.length !== b.missing_ingredients.length) {
      return a.missing_ingredients.length - b.missing_ingredients.length;
    }
    return (
      (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1)
    );
  });

  return withMatches.slice(0, maxResults);
}

/**
 * Get pantry items (for API response / display).
 */
export function getPantrySample(count = 20): string[] {
  return pantryData.all_items_flat.slice(0, count);
}

/** Number of recipes in the database (for API response). */
export const RECIPES_COUNT = recipes.length;
