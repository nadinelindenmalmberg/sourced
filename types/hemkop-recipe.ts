/**
 * Recipe from Hemköp API (or normalized from external recipe API).
 * Mirrors the data-retrieval pattern used for deals.
 */
export interface HemkopRecipe {
  id: string;
  name: string;
  description?: string;
  image?: string;
  url?: string;
  time_minutes?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  source: 'hemkop_api' | 'spoonacular_fallback';
}
