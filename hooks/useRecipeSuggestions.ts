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
  loadingAI: boolean;
  error: string | null;
  suggestRecipes: (deals: Deal[], mode: DifficultyMode) => Promise<void>;
  reset: () => void;
}

export function useRecipeSuggestions(): UseRecipeSuggestionsResult {
  const [matchedRecipes, setMatchedRecipes] = useState<MatchedRecipe[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestRecipes = useCallback(async (deals: Deal[], mode: DifficultyMode) => {
    setLoading(true);
    setLoadingAI(false);
    setError(null);
    setMatchedRecipes([]);
    setGeneratedRecipes([]);

    let matchedCount = 0;

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
      matchedCount = recipes.length;
    } catch (err) {
      console.error('Error matching recipes:', err);
      setError('Kunde inte hämta recept');
      setLoading(false);
      return;
    }

    // Phase 1 done — show matched results immediately
    setLoading(false);

    // Phase 2 — AI generation in background, only if needed
    if (matchedCount < 2 && deals.length >= 1) {
      setLoadingAI(true);
      try {
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
      } catch (err) {
        console.error('Error generating AI recipes:', err);
        // AI failure is non-critical — matched results are already shown
      } finally {
        setLoadingAI(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setMatchedRecipes([]);
    setGeneratedRecipes([]);
    setError(null);
    setLoadingAI(false);
  }, []);

  return {
    matchedRecipes,
    generatedRecipes,
    loading,
    loadingAI,
    error,
    suggestRecipes,
    reset,
  };
}
