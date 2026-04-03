'use client';

import { useState, useCallback } from 'react';
import type { Deal, DifficultyMode, MatchedRecipe, GeneratedRecipe } from '@/types';

const DIFFICULTY_MAP: Record<DifficultyMode, 'easy' | 'medium' | 'hard' | 'varied'> = {
  easy: 'easy',
  varied: 'varied',
  challenge: 'hard',
};

export interface UseRecipeSuggestionsResult {
  matchedRecipes: MatchedRecipe[];
  generatedRecipes: GeneratedRecipe[];
  loading: boolean;
  error: string | null;
  suggestRecipes: (deals: Deal[], mode: DifficultyMode) => Promise<void>;
  reset: () => void;
}

export function useRecipeSuggestions(): UseRecipeSuggestionsResult {
  const [matchedRecipes, setMatchedRecipes] = useState<MatchedRecipe[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestRecipes = useCallback(async (deals: Deal[], mode: DifficultyMode) => {
    setLoading(true);
    setError(null);
    setMatchedRecipes([]);
    setGeneratedRecipes([]);

    try {
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals }),
      });
      const matchData = await matchRes.json();

      let recipes: MatchedRecipe[] = matchData.recipes ?? [];

      if (mode === 'easy') {
        recipes = recipes.filter((r) => r.difficulty === 'easy');
      } else if (mode === 'challenge') {
        recipes = recipes.filter(
          (r) => r.difficulty === 'medium' || r.difficulty === 'hard'
        );
      }

      setMatchedRecipes(recipes);

      // Call AI to supplement if we have fewer than 2 matched recipes.
      // Use all passed deals (not just promoted ones — deals without promotion text are still valid).
      if (recipes.length < 2 && deals.length >= 1) {
        const topDeals = deals.slice(0, 10);
        const aiRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: topDeals.map((d) => d.name),
            difficulty: DIFFICULTY_MAP[mode],
            deals: topDeals,
          }),
        });
        const aiData = await aiRes.json();
        if (aiData.recipes?.length) {
          setGeneratedRecipes(aiData.recipes);
        }
      }
    } catch (err) {
      console.error('Error suggesting recipes:', err);
      setError('Kunde inte hämta recept');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setMatchedRecipes([]);
    setGeneratedRecipes([]);
    setError(null);
  }, []);

  return {
    matchedRecipes,
    generatedRecipes,
    loading,
    error,
    suggestRecipes,
    reset,
  };
}
