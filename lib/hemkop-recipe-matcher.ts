import type { Deal } from '@/types/deal';
import type { HemkopRecipe } from '@/types/hemkop-recipe';
import { dealMatchesIngredient } from '@/lib/recipe-matcher';

export interface HemkopRecipeWithDeals extends HemkopRecipe {
  matchedDeals: Deal[];
  matchCount: number;
}

/**
 * Extract searchable ingredient words from recipe (main ingredients + key words from name).
 */
function getIngredientCandidates(recipe: HemkopRecipe): string[] {
  const words = new Set<string>();

  if (recipe.ingredients?.length) {
    recipe.ingredients.forEach((ing) => {
      words.add(ing.trim());
      ing.split(/[\s,]+/).forEach((w) => w.length > 2 && words.add(w));
    });
  }

  if (recipe.name) {
    recipe.name
      .split(/[\s,–\-]+/)
      .forEach((w) => w.length > 2 && words.add(w.trim()));
  }

  if (recipe.description) {
    recipe.description
      .slice(0, 200)
      .split(/[\s,.\n]+/)
      .forEach((w) => w.length > 3 && words.add(w.trim()));
  }

  return Array.from(words).filter(Boolean);
}

/**
 * Match Hemköp recipes to current deals. Each recipe gets matchedDeals (products on sale
 * that match the recipe's ingredients) and matchCount. Sorted by match count (most matches first).
 */
export function matchHemkopRecipesToDeals(
  recipes: HemkopRecipe[],
  deals: Deal[]
): HemkopRecipeWithDeals[] {
  if (!deals.length) {
    return recipes.map((r) => ({ ...r, matchedDeals: [], matchCount: 0 }));
  }

  const result: HemkopRecipeWithDeals[] = recipes.map((recipe) => {
    const candidates = getIngredientCandidates(recipe);
    const matchedDeals: Deal[] = [];

    for (const deal of deals) {
      const matches = candidates.some((ing) => dealMatchesIngredient(deal.name, ing));
      if (matches && !matchedDeals.some((d) => d.id === deal.id)) {
        matchedDeals.push(deal);
      }
    }

    return {
      ...recipe,
      matchedDeals,
      matchCount: matchedDeals.length,
    };
  });

  result.sort((a, b) => b.matchCount - a.matchCount);
  return result;
}
