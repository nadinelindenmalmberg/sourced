'use client';

import { useState, useEffect, useRef } from 'react';
import type { DifficultyMode, GeneratedRecipe, MatchedRecipe, RecipeItem } from '@/types';
import { useDeals, useRecipeSuggestions } from '@/hooks';
import { getDifficultyColor, getDifficultyText } from '@/lib/recipe-utils';
import DealsGrid from '@/components/DealsGrid';
import {
  ChefHat,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ShoppingCart,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

function buildAllRecipes(
  matched: MatchedRecipe[],
  generated: GeneratedRecipe[]
): RecipeItem[] {
  return [
    ...matched.map((r) => ({ type: 'matched' as const, recipe: r })),
    ...generated.map((r) => ({ type: 'generated' as const, recipe: r })),
  ];
}

export default function Home() {
  const { deals, loading: loadingDeals, error: dealsError, storeId, setStoreId, fetchDeals } = useDeals('4547');
  const {
    matchedRecipes,
    generatedRecipes,
    loading: loadingSuggestions,
    error: suggestionsError,
    suggestRecipes,
    reset: resetSuggestions,
  } = useRecipeSuggestions();

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const recipeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSuggestRecipes = () => setShowDifficultySelector(true);

  const handleGenerateRecipes = async (mode: DifficultyMode) => {
    setShowDifficultySelector(false);
    setCurrentRecipeIndex(0);
    await suggestRecipes(deals, mode);
    setShowRecipes(true);
    setTimeout(() => recipeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const allRecipes = buildAllRecipes(matchedRecipes, generatedRecipes);

  const nextRecipe = () =>
    setCurrentRecipeIndex((prev) => (prev + 1) % allRecipes.length);
  const prevRecipe = () =>
    setCurrentRecipeIndex((prev) => (prev - 1 + allRecipes.length) % allRecipes.length);

  const closeRecipes = () => {
    setShowRecipes(false);
    resetSuggestions();
  };

  const loading = loadingSuggestions;
  const error = dealsError ?? suggestionsError;

  const currentItem = allRecipes[currentRecipeIndex];
  const isMatched = currentItem?.type === 'matched';
  const matchedRecipe = isMatched ? currentItem.recipe : null;
  const generatedRecipe = !isMatched && currentItem ? currentItem.recipe : null;

  return (
    <main className="min-h-screen bg-background pb-32">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="w-10 h-10 text-orange-500" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Sourced</h1>
          </div>
          <p className="text-muted-foreground">
            Se veckans erbjudanden och få receptförslag
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">
                Hemköp butik-ID:
              </label>
              <div className="flex gap-2 flex-1">
                <Input
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="flex-1 max-w-[120px]"
                  placeholder="4547"
                />
                <Button variant="outline" onClick={() => fetchDeals()} disabled={loadingDeals}>
                  {loadingDeals ? '...' : 'Byt butik'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Veckans erbjudanden {deals.length > 0 && `(${deals.length})`}
          </h2>
        </div>

        <DealsGrid
          deals={deals}
          selectedIngredients={selectedIngredients}
          onToggleIngredient={toggleIngredient}
          loading={loadingDeals}
        />

        {showDifficultySelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center">Välj svårighetsgrad</CardTitle>
                <CardDescription className="text-center">
                  Hur ambitiös vill du vara idag?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleGenerateRecipes('easy')}
                  className="w-full h-16 text-lg bg-green-500 hover:bg-green-600"
                  disabled={loading}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-bold">😌 Enkelt</span>
                    <span className="text-xs opacity-80">Snabba, simpla recept</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGenerateRecipes('varied')}
                  className="w-full h-16 text-lg bg-yellow-500 hover:bg-yellow-600"
                  disabled={loading}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-bold">🍳 Lite olika</span>
                    <span className="text-xs opacity-80">Blandade svårighetsgrader</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGenerateRecipes('challenge')}
                  className="w-full h-16 text-lg bg-red-500 hover:bg-red-600"
                  disabled={loading}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-bold">🔥 Utmaning</span>
                    <span className="text-xs opacity-80">Mer avancerade rätter</span>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDifficultySelector(false)}
                  className="w-full"
                >
                  Avbryt
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showRecipes && allRecipes.length > 0 && (
          <div ref={recipeContainerRef} className="fixed inset-0 bg-background z-50 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Receptförslag</h2>
                <Button variant="ghost" size="icon" onClick={closeRecipes}>
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevRecipe}
                  disabled={allRecipes.length <= 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentRecipeIndex + 1} av {allRecipes.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextRecipe}
                  disabled={allRecipes.length <= 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {currentItem && (
                <Card className="border-2">
                  {matchedRecipe ? (
                    <>
                      <CardHeader>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className={getDifficultyColor(matchedRecipe.difficulty)}>
                            {getDifficultyText(matchedRecipe.difficulty)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {matchedRecipe.time_minutes} min
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {matchedRecipe.servings} port
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl">{matchedRecipe.name}</CardTitle>
                        <CardDescription>{matchedRecipe.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingCart className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-700 dark:text-green-300">
                              Från veckans erbjudanden:
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {matchedRecipe.matched_deals.map((deal, i) => (
                              <Badge key={i} className="bg-green-600">
                                {deal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {matchedRecipe.missing_ingredients.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
                            <span className="text-sm text-amber-700 dark:text-amber-300">
                              💡 Du behöver även köpa:{' '}
                              {matchedRecipe.missing_ingredients.join(', ')}
                            </span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Ingredienser</h4>
                          <ul className="space-y-2">
                            {matchedRecipe.all_ingredients.map((ing, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span
                                  className={`${
                                    matchedRecipe.matched_deals.some(
                                      (d) =>
                                        d.toLowerCase().includes(ing.name.toLowerCase()) ||
                                        ing.name.toLowerCase().includes(d.toLowerCase())
                                    )
                                      ? 'text-green-600 font-medium'
                                      : ''
                                  } ${ing.pantry ? 'text-muted-foreground' : ''}`}
                                >
                                  • {ing.amount} {ing.name}
                                  {ing.pantry && (
                                    <span className="text-xs ml-1">(har hemma)</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Gör så här</h4>
                          <ol className="space-y-3">
                            {matchedRecipe.instructions.map((step, i) => (
                              <li key={i} className="flex gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                                  {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        {matchedRecipe.tips && (
                          <>
                            <Separator />
                            <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                              <p className="text-sm text-orange-700 dark:text-orange-300">
                                💡 <strong>Tips:</strong> {matchedRecipe.tips}
                              </p>
                            </div>
                          </>
                        )}
                        <Separator />
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={`https://www.ica.se/recept/sok/?q=${encodeURIComponent(matchedRecipe.search_query)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Hitta på ICA
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={`https://www.koket.se/recept?q=${encodeURIComponent(matchedRecipe.search_query)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Hitta på Köket.se
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  ) : generatedRecipe ? (
                    <>
                      <CardHeader>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI-genererat
                          </Badge>
                          {generatedRecipe.difficulty && (
                            <Badge className={getDifficultyColor(generatedRecipe.difficulty)}>
                              {getDifficultyText(generatedRecipe.difficulty)}
                            </Badge>
                          )}
                          {generatedRecipe.time_minutes != null && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {generatedRecipe.time_minutes} min
                            </Badge>
                          )}
                          {generatedRecipe.servings != null && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {generatedRecipe.servings} port
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-2xl">{generatedRecipe.title}</CardTitle>
                        {generatedRecipe.description && (
                          <CardDescription>{generatedRecipe.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Ingredienser</h4>
                          <ul className="space-y-2">
                            {generatedRecipe.ingredients.map((ing, i) =>
                              typeof ing === 'string' ? (
                                <li key={i}>• {ing}</li>
                              ) : (
                                <li
                                  key={i}
                                  className={ing.from_deal ? 'text-green-600 font-medium' : ''}
                                >
                                  • {ing.amount} {ing.item}
                                  {ing.from_deal && (
                                    <Badge className="ml-2 text-xs bg-green-500">
                                      På kampanj
                                    </Badge>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 text-lg">Gör så här</h4>
                          <ol className="space-y-3">
                            {generatedRecipe.instructions.map((step, i) => (
                              <li key={i} className="flex gap-3">
                                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                                  {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        {generatedRecipe.tips && (
                          <>
                            <Separator />
                            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                💡 <strong>Tips:</strong> {generatedRecipe.tips}
                              </p>
                            </div>
                          </>
                        )}
                        {generatedRecipe.search_query && (
                          <>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                              <Button asChild variant="outline" size="sm">
                                <a
                                  href={`https://www.ica.se/recept/sok/?q=${encodeURIComponent(generatedRecipe.search_query)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Liknande på ICA
                                </a>
                              </Button>
                              <Button asChild variant="outline" size="sm">
                                <a
                                  href={`https://www.koket.se/recept?q=${encodeURIComponent(generatedRecipe.search_query)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Liknande på Köket.se
                                </a>
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </>
                  ) : null}
                </Card>
              )}

              <div className="flex justify-center gap-2 mt-6">
                {allRecipes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentRecipeIndex(i)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i === currentRecipeIndex ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <Card className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                <p className="text-lg font-medium">Letar efter recept...</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleSuggestRecipes}
            disabled={loading || loadingDeals || deals.length === 0}
            size="lg"
            className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Letar...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Föreslå recept
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
