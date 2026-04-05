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
  // Strip parentheticals before matching (e.g. "köttbullar (färdigköpta)" → "köttbullar")
  const normalizedDeal = normalize(dealName).replace(/\(.*?\)/g, '').trim();
  const normalizedIngredient = normalize(ingredient).replace(/\(.*?\)/g, '').trim();

  if (normalizedDeal.includes(normalizedIngredient)) return true;
  if (normalizedIngredient.includes(normalizedDeal)) return true;

  const dealWords = normalizedDeal.split(/\s+/);
  const ingredientWords = normalizedIngredient.split(/\s+/);

  for (const dealWord of dealWords) {
    for (const ingredientWord of ingredientWords) {
      if (dealWord.length > 2 && ingredientWord.length > 2) {
        if (dealWord.startsWith(ingredientWord) || ingredientWord.startsWith(dealWord) ||
            dealWord.endsWith(ingredientWord) || ingredientWord.endsWith(dealWord)) {
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
export function scoreRecipe(recipe: Recipe, deals: DealMatchInput[]): MatchedRecipe & { key_deal_matches: number } {
  const matchedDeals: string[] = [];
  const missingIngredients: string[] = [];
  const pantryIngredients: string[] = [];
  let keyDealMatches = 0;

  for (const keyIng of recipe.key_ingredients) {
    if (isPantryItem(keyIng)) {
      pantryIngredients.push(keyIng);
      continue;
    }
    const matchingDeal = deals.find((d) => dealMatchesIngredient(d.name, keyIng));
    if (matchingDeal) {
      if (!matchedDeals.includes(matchingDeal.name)) matchedDeals.push(matchingDeal.name);
      keyDealMatches++;
    } else {
      missingIngredients.push(keyIng);
    }
  }

  for (const ing of recipe.all_ingredients) {
    if (ing.pantry || isPantryItem(ing.name)) {
      if (!pantryIngredients.includes(ing.name)) pantryIngredients.push(ing.name);
      continue;
    }
    const matchingDeal = deals.find((d) => dealMatchesIngredient(d.name, ing.name));
    if (matchingDeal && !matchedDeals.includes(matchingDeal.name)) {
      matchedDeals.push(matchingDeal.name);
    }
  }

  // Protein boost: if any key deal match is a protein-category deal, reward it heavily
  const matchedKeyDeals = deals.filter((d) => matchedDeals.includes(d.name) &&
    recipe.key_ingredients.some((k) => dealMatchesIngredient(d.name, k)));
  const proteinBonus = matchedKeyDeals.some((d) => isProteinDeal(d.name)) ? 20 : 0;

  const missingPenalty = missingIngredients.length * 2;
  // Key ingredient matches are weighted heavily; secondary matches add a smaller bonus.
  const score = keyDealMatches * 15 + matchedDeals.length * 3 - missingPenalty + proteinBonus;

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
    key_deal_matches: keyDealMatches,
  };
}

const EXPENSIVE_PROTEINS = [
  'kyckling', 'lax', 'fisk', 'kött', 'köttfärs', 'nöt', 'nötfärs',
  'lamm', 'räkor', 'tonfisk', 'krabba', 'hummer', 'biff', 'entrecote',
  'fläsk', 'anka', 'kalkon', 'hjort', 'vildsvin',
];

const PROTEIN_NAMES = [
  'kyckling', 'lax', 'fisk', 'kött', 'köttfärs', 'nöt', 'nötfärs',
  'lamm', 'räkor', 'tonfisk', 'krabba', 'hummer', 'biff', 'entrecote',
  'fläsk', 'anka', 'kalkon', 'bacon', 'skinka', 'korv', 'köttbullar',
  'lövbiff', 'kassler', 'falukorv', 'chorizo', 'torsk', 'sej', 'makrill',
];

function isProteinDeal(dealName: string): boolean {
  const name = normalize(dealName);
  return PROTEIN_NAMES.some((p) => name.includes(normalize(p)));
}

function isExpensiveProtein(deal: DealMatchInput): boolean {
  const name = normalize(deal.name);
  const price = deal.price ?? 0;
  return price > 40 && EXPENSIVE_PROTEINS.some((p) => name.includes(normalize(p)));
}

export interface MatchRecipesOptions {
  maxResults?: number;
  minDealMatches?: number;
}

/**
 * Match deals against the recipe database and return top scored recipes.
 * A recipe qualifies if it has 2+ deal matches, or 1 match that is an expensive protein (price > 40 kr).
 */
export function matchRecipes(
  deals: DealMatchInput[],
  options: MatchRecipesOptions = {}
): MatchedRecipe[] {
  const { maxResults = 8 } = options;

  if (!deals || deals.length === 0) return [];

  const scored = recipes.map((recipe) => scoreRecipe(recipe, deals));
  const withMatches = scored.filter((r) => {
    // Must have 2+ key ingredients on sale, OR exactly 1 key ingredient that is a protein.
    // This prevents recipes from appearing just because cheap secondary items (dill, grädde)
    // happen to be on sale — the MAIN ingredient must drive the suggestion.
    if (r.key_deal_matches >= 2) return true;
    if (r.key_deal_matches === 1) {
      const matchedKeyDeal = deals.find(
        (d) =>
          r.matched_deals.includes(d.name) &&
          r.key_ingredients.some((k) => dealMatchesIngredient(d.name, k))
      );
      return matchedKeyDeal ? isProteinDeal(matchedKeyDeal.name) : false;
    }
    return false;
  });

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
