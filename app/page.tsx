'use client';

import { useState, useEffect, useRef } from 'react';
import type { DifficultyMode, GeneratedRecipe, MatchedRecipe, RecipeItem } from '@/types';
import { useDeals, useRecipeSuggestions } from '@/hooks';
import { useLanguage } from '@/lib/i18n-context';
import pantryData from '@/data/pantry.json';
import Image from 'next/image';
import DealsGrid from '@/components/DealsGrid';
import RecipeCard from '@/components/RecipeCard';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Warehouse,
  MapPin,
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
    loadingAI,
    error: suggestionsError,
    suggestRecipes,
    reset: resetSuggestions,
  } = useRecipeSuggestions();

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [storeExpanded, setStoreExpanded] = useState(false);
  const [showPantry, setShowPantry] = useState(false);
  const [showPantryTooltip, setShowPantryTooltip] = useState(true);
  const [overriddenPantry, setOverriddenPantry] = useState<string[]>([]);
  const [userHasItems, setUserHasItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string>('');
  const [storeAddress, setStoreAddress] = useState<string>('');
  const [storeInputValue, setStoreInputValue] = useState('');
  const [storeError, setStoreError] = useState('');
  const recipeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide tooltip after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowPantryTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Resolve store ID → name + address
  useEffect(() => {
    fetch(`/api/store?storeId=${storeId}`)
      .then((r) => r.json())
      .then((d) => { if (d.name) { setStoreName(d.name.replace('Hemköp ', '')); setStoreAddress(d.address); } })
      .catch(() => {});
  }, [storeId]);

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

  const handleGenerateRecipes = (mode: DifficultyMode) => {
    setShowDifficultySelector(false);
    setCurrentRecipeIndex(0);
    const dealsToUse = selectedIngredients.length > 0
      ? deals.filter((d) => selectedIngredients.includes(d.name))
      : deals;
    setShowRecipes(true);
    setTimeout(() => recipeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    suggestRecipes(dealsToUse, mode); // fire without await — overlay opens immediately
  };

  const filteredMatched = selectedTags.length > 0
    ? matchedRecipes.filter((r) => selectedTags.every((tag) => r.tags?.includes(tag)))
    : matchedRecipes;
  const allRecipes = buildAllRecipes(filteredMatched, generatedRecipes);
  const nextRecipe = () => setCurrentRecipeIndex((prev) => (prev + 1) % allRecipes.length);
  const prevRecipe = () => setCurrentRecipeIndex((prev) => (prev - 1 + allRecipes.length) % allRecipes.length);

  const closeRecipes = () => {
    setShowRecipes(false);
    setSelectedTags([]);
    resetSuggestions();
  };

  // Dietary tag filtering — only applies to matched recipes (generated have no tags)
  const SHOWN_TAGS = ['vegetariskt', 'snabb', 'budget', 'barnvänlig', 'nyttigt', 'helg', 'fredagsmys'];
  const availableTags = SHOWN_TAGS.filter((tag) =>
    matchedRecipes.some((r) => r.tags?.includes(tag))
  );
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const loading = loadingSuggestions || loadingAI;
  const error = dealsError ?? suggestionsError;
  const currentItem = allRecipes[currentRecipeIndex];

  const allPantryItems = pantryData.display_items;

  const CATEGORY_LABELS: Record<string, string> = {
    'kott-fagel-och-chark': 'Kött & fågel',
    'fisk-och-skaldjur': 'Fisk & skaldjur',
    'mejeri-ost-och-agg': 'Mejeri & ost',
    'frukt-och-gront': 'Frukt & grönt',
    'fryst': 'Fryst',
    'skafferi': 'Skafferi',
    'brod-och-kakor': 'Bröd & bakverk',
    'fardigmat': 'Färdigmat',
    'dryck': 'Dryck',
    'vegetariskt': 'Vegetariskt',
    'delikatessen': 'Delikatessen',
    'godis-snacks-och-glass': 'Godis & snacks',
  };
  const NON_FOOD_CATS = ['hem-och-hushall', 'blommor-och-tillbehor', 'hushall', 'hygien', 'djur', 'halsa'];
  const availableCategories = Array.from(
    new Set(deals.map((d) => d.category).filter((c): c is string => !!c && !NON_FOOD_CATS.some((nf) => c.includes(nf))))
  );
  const filteredDeals = activeCategory === 'all' ? deals : deals.filter((d) => d.category === activeCategory);

  return (
    <main className="min-h-screen pb-28 bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white backdrop-blur-xl">
        {/* Top row */}
        <div className="relative px-4 sm:px-6 h-14 flex items-center justify-between">
          <Image src="/logo.png" alt="Sourced" width={130} height={40} className="h-[64px] w-auto" priority unoptimized />

          <div className="flex items-center gap-1">
            {/* Pantry */}
            <div className="relative">
              {showPantryTooltip && (
                <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl whitespace-nowrap z-10 shadow-lg">
                  {t('pantryTooltip')}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              )}
              <button
                onClick={() => { setShowPantry(true); setShowPantryTooltip(false); }}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <Warehouse className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Store chip */}
            <button
              onClick={() => { setStoreExpanded((v) => !v); setStoreInputValue(''); setStoreError(''); }}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors max-w-[160px] ${storeExpanded ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{storeName || storeId}</span>
            </button>

            {/* Language */}
            <div className="flex border border-gray-200 bg-white rounded-full p-0.5 ml-0.5">
              {(['sv', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-full transition-all ${lang === l ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>


      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-red-500">{error}</p>
          </div>
        )}

        {/* Hero */}
        <div className="pt-6 pb-5 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mt-1">
            {t('heroSubtitle')}
          </p>
          {!loadingDeals && deals.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              {t('selectIngredients')}
            </p>
          )}
        </div>

        {/* Category filter — sticky just above the grid */}
        {availableCategories.length > 0 && (
          <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-1.5 w-max">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Alla
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-coral text-white border border-transparent' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deals grid */}
        <div className={availableCategories.length > 0 ? 'pt-4' : ''}>
          <DealsGrid
            deals={filteredDeals}
            selectedIngredients={selectedIngredients}
            onToggleIngredient={toggleIngredient}
            loading={loadingDeals}
          />
        </div>
      </div>

      {/* Store switcher modal */}
      {storeExpanded && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Byt butik</h3>
                {storeName && <p className="text-sm text-gray-500 mt-0.5">{storeName}</p>}
              </div>
              <button onClick={() => setStoreExpanded(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-500">Ange butikens ID-nummer från Hemköps webbplats.</p>
              <div className="flex gap-2">
                <input
                  value={storeInputValue}
                  onChange={(e) => { setStoreInputValue(e.target.value); setStoreError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && storeInputValue.trim()) {
                      const id = storeInputValue.trim();
                      fetch(`/api/store?storeId=${id}`)
                        .then(r => r.json())
                        .then(d => {
                          if (d.name) { setStoreId(id); fetchDeals(); setStoreExpanded(false); }
                          else setStoreError('Butiken hittades inte');
                        })
                        .catch(() => setStoreError('Kunde inte kontakta API'));
                    }
                  }}
                  className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="t.ex. 4547"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const id = storeInputValue.trim();
                    if (!id) return;
                    fetch(`/api/store?storeId=${id}`)
                      .then(r => r.json())
                      .then(d => {
                        if (d.name) { setStoreId(id); fetchDeals(); setStoreExpanded(false); }
                        else setStoreError('Butiken hittades inte');
                      })
                      .catch(() => setStoreError('Kunde inte kontakta API'));
                  }}
                  disabled={!storeInputValue.trim() || loadingDeals}
                  className="h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors"
                >
                  Byt
                </button>
              </div>
              {storeError && <p className="text-xs text-red-500">{storeError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Difficulty modal */}
      {showDifficultySelector && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="px-6 pt-6 pb-3">
              <h3 className="text-xl font-bold text-gray-900 text-center">{t('chooseDifficulty')}</h3>
              <p className="text-sm text-gray-400 text-center mt-1">{t('difficultySubtitle')}</p>
            </div>
            <div className="px-4 pb-5 space-y-2">
              {[
                { mode: 'easy' as DifficultyMode, icon: '😌', label: t('easy'), desc: t('easyDesc'), color: 'bg-sage-light border-sage/30 hover:border-sage' },
                { mode: 'varied' as DifficultyMode, icon: '🍳', label: t('varied'), desc: t('variedDesc'), color: 'bg-amber-50 border-amber-200/50 hover:border-amber-300' },
                { mode: 'challenge' as DifficultyMode, icon: '🔥', label: t('challenge'), desc: t('challengeDesc'), color: 'bg-coral-light border-coral/20 hover:border-coral/40' },
              ].map(({ mode, icon, label, desc, color }) => (
                <button
                  key={mode}
                  onClick={() => handleGenerateRecipes(mode)}
                  disabled={loading}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 ${color} transition-all text-left disabled:opacity-50 active:scale-[0.98]`}
                >
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col animate-fade-in-up">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t('pantryTitle')}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{t('pantryDesc')}</p>
              </div>
              <button
                onClick={() => setShowPantry(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ml-3 mt-0.5"
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
                className="w-full bg-gray-900 text-white rounded-full py-3 text-sm font-bold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-sm"
              >
                {t('done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe overlay */}
      {showRecipes && (loadingSuggestions || loadingAI || allRecipes.length > 0) && (
        <div ref={recipeContainerRef} className="fixed inset-0 bg-white z-50 overflow-y-auto">
          {/* Overlay nav bar */}
          <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100/80">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{t('recipesSuggested')}</h2>
              <button
                onClick={closeRecipes}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 py-6">

            {/* Dietary tag filters */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { toggleTag(tag); setCurrentRecipeIndex(0); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-sage text-white'
                        : 'border border-sage/40 bg-sage-light text-gray-700 hover:border-sage'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => { setSelectedTags([]); setCurrentRecipeIndex(0); }}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    {t('clearFilters')}
                  </button>
                )}
              </div>
            )}

            {/* No results after tag filtering */}
            {!loadingSuggestions && selectedTags.length > 0 && filteredMatched.length === 0 && generatedRecipes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">{t('noRecipesForTags')}</p>
            )}

            {/* Phase 1: matching */}
            {loadingSuggestions && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-coral animate-spin" />
                <p className="text-sm text-gray-400">{t('findingRecipes')}</p>
              </div>
            )}

            {/* Phase 2: AI generating in background */}
            {!loadingSuggestions && loadingAI && allRecipes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
                <p className="text-sm text-gray-400">{t('aiGenerating')}</p>
              </div>
            )}

            {!loadingSuggestions && loadingAI && allRecipes.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-3.5 h-3.5 rounded-full border border-purple-300 border-t-purple-500 animate-spin flex-shrink-0" />
                <p className="text-xs text-purple-500">{t('aiGenerating')}</p>
              </div>
            )}

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
              <RecipeCard
                matched={currentItem.type === 'matched' ? currentItem.recipe : undefined}
                generated={currentItem.type === 'generated' ? currentItem.recipe : undefined}
                overriddenPantry={overriddenPantry}
                onTogglePantry={togglePantryOverride}
                userHasItems={userHasItems}
                onToggleUserHas={(name) => setUserHasItems((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])}
              />
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


      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-14 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none z-30">
        <div className="max-w-sm mx-auto pointer-events-auto">
          <button
            onClick={handleSuggestRecipes}
            disabled={loading || loadingDeals || deals.length === 0}
            className="w-full h-14 rounded-full bg-gradient-to-r from-coral to-[#E8805C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base text-white shadow-xl shadow-coral/30 hover:shadow-2xl hover:shadow-coral/40 hover:brightness-110 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-[3px] border-white/20 border-t-white" />
                {t('findingRecipes')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('ctaInspire')}
                {selectedIngredients.length > 0 && (
                  <span className="bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-0.5 rounded-full ml-1">
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
