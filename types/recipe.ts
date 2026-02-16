/**
 * Ingredient in a recipe (from database).
 */
export interface RecipeIngredient {
  name: string;
  amount: string;
  required: boolean;
  pantry?: boolean;
}

/**
 * Recipe from local database (recipes.json).
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  time_minutes: number;
  servings: number;
  tags: string[];
  key_ingredients: string[];
  all_ingredients: RecipeIngredient[];
  instructions: string[];
  tips?: string;
  search_query: string;
}

/**
 * Recipe with match metadata (from /api/match).
 */
export interface MatchedRecipe extends Recipe {
  match_score: number;
  matched_deals: string[];
  missing_ingredients: string[];
  pantry_ingredients: string[];
  match_percentage: number;
}

/**
 * AI-generated recipe (from /api/generate).
 */
export interface GeneratedRecipe {
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_minutes?: number;
  servings?: number;
  ingredients:
    | Array<{ item: string; amount: string; from_deal?: boolean }>
    | string[];
  instructions: string[];
  tips?: string;
  search_query: string;
}

/**
 * Difficulty mode selected by user in UI.
 */
export type DifficultyMode = 'easy' | 'varied' | 'challenge';

/**
 * Union for display in recipe carousel (database or AI).
 */
export type RecipeItem =
  | { type: 'matched'; recipe: MatchedRecipe }
  | { type: 'generated'; recipe: GeneratedRecipe };
