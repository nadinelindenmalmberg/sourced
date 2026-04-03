'use client';

import { useState, useEffect, useRef } from 'react';
import type { DifficultyMode, GeneratedRecipe, MatchedRecipe, RecipeItem } from '@/types';
import { useDeals, useRecipeSuggestions } from '@/hooks';
import { getDifficultyColor, getDifficultyText } from '@/lib/recipe-utils';
import { useLanguage } from '@/lib/i18n-context';
import pantryData from '@/data/pantry.json';
import DealsGrid from '@/components/DealsGrid';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  X,
  Settings2,
  Check,
} from 'lucide-react';

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
  const { t, lang, setLang } = useLanguage();
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
  const [storeExpanded, setStoreExpanded] = useState(false);
  const [pendingStoreId, setPendingStoreId] = useState(storeId);
  const [showPantry, setShowPantry] = useState(false);
  const [showPantryTooltip, setShowPantryTooltip] = useState(true);
  const [overriddenPantry, setOverriddenPantry] = useState<string[]>([]);
  const recipeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPendingStoreId(storeId);
  }, [storeId]);

  // Hide tooltip after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowPantryTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const togglePantryOverride = (name: string) => {
    setOverriddenPantry((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSuggestRecipes = () => setShowDifficultySelector(true);

  const handleGenerateRecipes = async (mode: DifficultyMode) => {
    setShowDifficultySelector(false);
    setCurrentRecipeIndex(0);
    const dealsToUse = selectedIngredients.length > 0
      ? deals.filter((d) => selectedIngredients.includes(d.name))
      : deals;
    await suggestRecipes(dealsToUse, mode);
    setShowRecipes(true);
    setTimeout(() => recipeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const allRecipes = buildAllRecipes(matchedRecipes, generatedRecipes);
  const nextRecipe = () => setCurrentRecipeIndex((prev) => (prev + 1) % allRecipes.length);
  const prevRecipe = () => setCurrentRecipeIndex((prev) => (prev - 1 + allRecipes.length) % allRecipes.length);

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

  const allPantryItems = pantryData.all_items_flat;
  const isInPantry = (name: string) => {
    const n = name.toLowerCase();
    return allPantryItems.some((item) => n.includes(item.toLowerCase()) || item.toLowerCase().includes(n));
  };

  const stripRecept = (q: string) => q.replace(/\brecept\b/gi, '').trim();

  // Same fuzzy logic as recipe-matcher's dealMatchesIngredient — needed for display categorisation
  const norm = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').trim();
  const ingMatchesDeal = (ingName: string, dealName: string): boolean => {
    const nd = norm(dealName), ni = norm(ingName);
    if (nd.includes(ni) || ni.includes(nd)) return true;
    for (const dw of nd.split(/\s+/)) for (const iw of ni.split(/\s+/))
      if (dw.length > 2 && iw.length > 2 && (dw.startsWith(iw) || iw.startsWith(dw))) return true;
    return false;
  };

  return (
    <main className="min-h-screen bg-white pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between py-4">
          {/* Pantry button + tooltip */}
          <div className="relative">
            {showPantryTooltip && (
              <div className="absolute top-full mt-2 left-0 bg-sage text-white text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap z-10 shadow-sm">
                {t('pantryTooltip')}
                <div className="absolute -top-1.5 left-5 w-2.5 h-2.5 bg-sage rotate-45" />
              </div>
            )}
            <button
              onClick={() => { setShowPantry(true); setShowPantryTooltip(false); }}
              className="bg-sage-light text-sage-dark text-sm font-semibold px-4 py-2 rounded-full hover:bg-sage hover:text-white transition-colors"
            >
              {t('pantryButton')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => setLang('sv')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${lang === 'sv' ? 'bg-coral text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                SV
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${lang === 'en' ? 'bg-coral text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                EN
              </button>
            </div>

            {/* Store chip */}
            <button
              onClick={() => setStoreExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {t('storeLabel')}: {storeId}
            </button>
          </div>
        </div>

        {/* Store selector (expanded) */}
        {storeExpanded && (
          <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
            <label className="text-sm font-semibold text-gray-500 whitespace-nowrap">{t('storeLabel')}:</label>
            <input
              value={pendingStoreId}
              onChange={(e) => setPendingStoreId(e.target.value)}
              className="flex-1 max-w-[100px] text-sm bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-coral/30"
              placeholder="4547"
            />
            <button
              onClick={() => { setStoreId(pendingStoreId); fetchDeals(); setStoreExpanded(false); }}
              disabled={loadingDeals}
              className="text-sm font-semibold bg-coral text-white disabled:opacity-50 px-4 py-1.5 rounded-full transition-colors hover:bg-coral-muted"
            >
              {t('changeStore')}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-red-500">{error}</p>
          </div>
        )}

        {/* Hero text */}
        <div className="pt-1 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-sm sm:text-base font-semibold text-gray-500 mt-0.5">
            {t('heroSubtitle')}
          </p>
          {!loadingDeals && deals.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{t('selectIngredients')}</p>
          )}
        </div>

        {/* Deals grid — full width */}
        <DealsGrid
          deals={deals}
          selectedIngredients={selectedIngredients}
          onToggleIngredient={toggleIngredient}
          loading={loadingDeals}
        />
      </div>

      {/* Difficulty modal */}
      {showDifficultySelector && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-xl font-bold text-gray-900 text-center">{t('chooseDifficulty')}</h3>
              <p className="text-sm text-gray-400 text-center mt-1">{t('difficultySubtitle')}</p>
            </div>
            <div className="px-4 pb-5 space-y-2">
              {[
                { mode: 'easy' as DifficultyMode, icon: '😌', label: t('easy'), desc: t('easyDesc') },
                { mode: 'varied' as DifficultyMode, icon: '🍳', label: t('varied'), desc: t('variedDesc') },
                { mode: 'challenge' as DifficultyMode, icon: '🔥', label: t('challenge'), desc: t('challengeDesc') },
              ].map(({ mode, icon, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => handleGenerateRecipes(mode)}
                  disabled={loading}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-gray-100 hover:bg-coral-light hover:border-coral/30 transition-all text-left disabled:opacity-50"
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setShowDifficultySelector(false)}
                className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pantry modal */}
      {showPantry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('pantryTitle')}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{t('pantryDesc')}</p>
              </div>
              <button
                onClick={() => setShowPantry(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0 ml-3 mt-0.5"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                {allPantryItems.map((item) => {
                  const isOut = overriddenPantry.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => togglePantryOverride(item)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${
                        isOut
                          ? 'border-gray-100 text-gray-300 bg-white'
                          : 'border-sage/40 bg-sage-light text-gray-700 font-medium'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${isOut ? 'border-gray-200' : 'border-sage bg-sage'}`}>
                        {!isOut && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-4 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowPantry(false)}
                className="w-full bg-coral text-white rounded-full py-3 text-sm font-semibold hover:bg-coral-muted transition-colors shadow-sm"
              >
                {t('done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe overlay */}
      {showRecipes && allRecipes.length > 0 && (
        <div ref={recipeContainerRef} className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('recipesSuggested')}</h2>
              <button
                onClick={closeRecipes}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {allRecipes.length > 1 && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <button onClick={prevRecipe} className="w-9 h-9 rounded-full border-2 border-gray-200 hover:border-gray-400 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-400">
                  {currentRecipeIndex + 1} {t('of')} {allRecipes.length}
                </span>
                <button onClick={nextRecipe} className="w-9 h-9 rounded-full border-2 border-gray-200 hover:border-gray-400 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}

            {currentItem && (
              <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white">
                {matchedRecipe ? (
                  <>
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 border-gray-200 ${getDifficultyColor(matchedRecipe.difficulty)}`}>
                          {getDifficultyText(matchedRecipe.difficulty)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          <Clock className="w-3 h-3" />{matchedRecipe.time_minutes} {t('minutes')}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          <Users className="w-3 h-3" />{matchedRecipe.servings} {t('servings')}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{matchedRecipe.name}</h3>
                      {matchedRecipe.description && (
                        <p className="text-sm text-gray-500 mt-1">{matchedRecipe.description}</p>
                      )}
                    </div>

                    <div className="px-6 py-5 space-y-5">
                      {/* Ingredient sections */}
                      {(() => {
                        const onSaleItems = matchedRecipe.all_ingredients.filter((ing) => {
                          const isP = ing.pantry || isInPantry(ing.name);
                          return !isP && matchedRecipe.matched_deals.some((d) => ingMatchesDeal(ing.name, d));
                        });
                        const pantryItems = matchedRecipe.all_ingredients.filter(
                          (ing) => (ing.pantry || isInPantry(ing.name)) && !overriddenPantry.includes(ing.name)
                        );
                        const toBuyItems = matchedRecipe.all_ingredients.filter((ing) => {
                          const isP = ing.pantry || isInPantry(ing.name);
                          const isOnSale = matchedRecipe.matched_deals.some((d) => ingMatchesDeal(ing.name, d));
                          return (!isP && !isOnSale) || (isP && overriddenPantry.includes(ing.name));
                        });

                        return (
                          <div className="space-y-3">
                            {onSaleItems.length > 0 && (
                              <div className="rounded-2xl bg-sage-light border border-sage/30 overflow-hidden">
                                <div className="px-4 py-2 border-b border-sage/20 flex items-center gap-1.5">
                                  <span className="text-base">🟢</span>
                                  <span className="text-xs font-semibold text-sage-dark">{t('onSale')}</span>
                                </div>
                                <ul className="divide-y divide-lime-100">
                                  {onSaleItems.map((ing, i) => (
                                    <li key={i} className="px-4 py-2.5 flex justify-between items-center">
                                      <span className="text-sm font-semibold text-gray-800">{ing.name}</span>
                                      <span className="text-xs font-semibold text-sage-dark">{ing.amount}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {toBuyItems.length > 0 && (
                              <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 overflow-hidden">
                                <div className="px-4 py-2 border-b-2 border-orange-200 flex items-center gap-1.5">
                                  <span className="text-base">🛒</span>
                                  <span className="text-xs font-bold text-orange-700">{t('toBuy')}</span>
                                </div>
                                <ul className="divide-y divide-orange-100">
                                  {toBuyItems.map((ing, i) => (
                                    <li key={i} className="px-4 py-2.5 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-800">{ing.name}</span>
                                        {ing.pantry && overriddenPantry.includes(ing.name) && (
                                          <button onClick={() => togglePantryOverride(ing.name)} className="text-[10px] font-bold text-orange-500 border-2 border-orange-200 px-1.5 py-0.5 rounded-full">
                                            hemma?
                                          </button>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-400">{ing.amount}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {pantryItems.length > 0 && (
                              <div className="rounded-2xl bg-gray-50 border-2 border-gray-100 overflow-hidden">
                                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1.5">
                                  <span className="text-base">🏠</span>
                                  <span className="text-xs font-bold text-gray-500">{t('atHome')}</span>
                                  <span className="text-[10px] text-gray-400 ml-auto">{t('tapToToggle')}</span>
                                </div>
                                <ul className="divide-y divide-gray-100">
                                  {pantryItems.map((ing, i) => (
                                    <li key={i}>
                                      <button onClick={() => togglePantryOverride(ing.name)} className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-100 transition-colors text-left">
                                        <span className="text-sm text-gray-400">{ing.name}</span>
                                        <span className="text-xs text-gray-300">{ing.amount}</span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="h-px bg-gray-100" />

                      {/* Instructions */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3">{t('instructions')}</h4>
                        <ol className="space-y-3">
                          {matchedRecipe.instructions.map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral flex items-center justify-center text-xs font-bold text-white">
                                {i + 1}
                              </span>
                              <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {matchedRecipe.tips && (
                        <>
                          <div className="h-px bg-gray-100" />
                          <div className="bg-coral-light border border-coral/20 rounded-2xl p-4">
                            <p className="text-sm font-semibold text-coral">
                              💡 {t('tips')}: <span className="font-normal">{matchedRecipe.tips}</span>
                            </p>
                          </div>
                        </>
                      )}

                      <div className="h-px bg-gray-100" />

                      <div className="flex flex-wrap gap-2">
                        <a href={`https://www.ica.se/recept/?q=${encodeURIComponent(stripRecept(matchedRecipe.search_query))}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-900 px-4 py-2 rounded-full transition-colors">
                          {t('findOnICA')}
                        </a>
                        <a href={`https://www.koket.se/search?searchtext=${encodeURIComponent(stripRecept(matchedRecipe.search_query))}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-900 px-4 py-2 rounded-full transition-colors">
                          {t('findOnKoket')}
                        </a>
                      </div>
                    </div>
                  </>
                ) : generatedRecipe ? (
                  <>
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 border-2 border-purple-200 px-3 py-1 rounded-full">
                          <Sparkles className="w-3 h-3" />{t('aiGenerated')}
                        </span>
                        {generatedRecipe.difficulty && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 border-gray-200 ${getDifficultyColor(generatedRecipe.difficulty)}`}>
                            {getDifficultyText(generatedRecipe.difficulty)}
                          </span>
                        )}
                        {generatedRecipe.time_minutes != null && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            <Clock className="w-3 h-3" />{generatedRecipe.time_minutes} {t('minutes')}
                          </span>
                        )}
                        {generatedRecipe.servings != null && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            <Users className="w-3 h-3" />{generatedRecipe.servings} {t('servings')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{generatedRecipe.title}</h3>
                      {generatedRecipe.description && (
                        <p className="text-sm text-gray-500 mt-1">{generatedRecipe.description}</p>
                      )}
                    </div>

                    <div className="px-6 py-5 space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3">{t('ingredients')}</h4>
                        <ul className="space-y-1.5">
                          {generatedRecipe.ingredients.map((ing, i) =>
                            typeof ing === 'string' ? (
                              <li key={i} className="text-sm text-gray-700">• {ing}</li>
                            ) : (
                              <li key={i} className={`text-sm flex items-center gap-2 ${ing.from_deal ? 'text-lime-700 font-semibold' : 'text-gray-700'}`}>
                                <span>• {ing.amount} {ing.item}</span>
                                {ing.from_deal && <span className="text-[10px] font-bold bg-lime-200 border border-lime-300 text-lime-800 px-2 py-0.5 rounded-full">rea</span>}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div className="h-px bg-gray-100" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3">{t('instructions')}</h4>
                        <ol className="space-y-3">
                          {generatedRecipe.instructions.map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral flex items-center justify-center text-xs font-bold text-white">
                                {i + 1}
                              </span>
                              <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                      {generatedRecipe.tips && (
                        <>
                          <div className="h-px bg-gray-100" />
                          <div className="bg-coral-light border border-coral/20 rounded-2xl p-4">
                            <p className="text-sm font-semibold text-coral">
                              💡 {t('tips')}: <span className="font-normal">{generatedRecipe.tips}</span>
                            </p>
                          </div>
                        </>
                      )}
                      {generatedRecipe.search_query && (
                        <>
                          <div className="h-px bg-gray-100" />
                          <div className="flex flex-wrap gap-2">
                            <a href={`https://www.ica.se/recept/sok/?q=${encodeURIComponent(stripRecept(generatedRecipe.search_query))}`} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-900 px-4 py-2 rounded-full transition-colors">
                              {t('similarOnICA')}
                            </a>
                            <a href={`https://www.koket.se/search?searchtext=${encodeURIComponent(stripRecept(generatedRecipe.search_query))}`} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-700 border-2 border-gray-200 hover:border-gray-900 px-4 py-2 rounded-full transition-colors">
                              {t('similarOnKoket')}
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {allRecipes.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {allRecipes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentRecipeIndex(i)}
                    className={`rounded-full transition-all ${i === currentRecipeIndex ? 'w-5 h-2 bg-gray-900' : 'w-2 h-2 bg-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-900 rounded-3xl px-8 py-6 flex flex-col items-center gap-4 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            <p className="text-sm font-bold text-gray-700">{t('findingRecipes')}</p>
          </div>
        </div>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-10 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none">
        <div className="max-w-sm mx-auto pointer-events-auto">
          <button
            onClick={handleSuggestRecipes}
            disabled={loading || loadingDeals || deals.length === 0}
            className="w-full h-14 rounded-full bg-coral disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base text-white shadow-lg shadow-coral/25 hover:bg-coral-muted transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                {t('findingRecipes')}
              </>
            ) : (
              <>
                {t('ctaInspire')}
                {selectedIngredients.length > 0 && (
                  <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {selectedIngredients.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
