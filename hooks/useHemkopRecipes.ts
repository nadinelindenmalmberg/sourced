'use client';

import { useState, useCallback } from 'react';
import type { HemkopRecipe } from '@/types/hemkop-recipe';

export interface UseHemkopRecipesResult {
  recipes: HemkopRecipe[];
  loading: boolean;
  error: string | null;
  source: string | null;
  fetchRecipes: (options?: { fallback?: boolean; q?: string; max?: number }) => Promise<void>;
}

export function useHemkopRecipes(): UseHemkopRecipesResult {
  const [recipes, setRecipes] = useState<HemkopRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fetchRecipes = useCallback(async (options?: { fallback?: boolean; q?: string; max?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options?.fallback) params.set('fallback', 'true');
      if (options?.q != null && options.q !== '') params.set('q', options.q);
      if (options?.max != null) params.set('max', String(options.max));
      const url = `/api/recipes/hemkop${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setRecipes([]);
        setSource(null);
      } else if (data.recipes?.length > 0) {
        setRecipes(data.recipes);
        setSource(data.source ?? 'hemkop_api');
      } else {
        setRecipes([]);
        setSource(data.source ?? null);
        setError(data.message ?? 'Inga recept hittades');
      }
    } catch (err) {
      console.error('Error fetching Hemköp recipes:', err);
      setError('Kunde inte hämta recept');
      setRecipes([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    recipes,
    loading,
    error,
    source,
    fetchRecipes,
  };
}
