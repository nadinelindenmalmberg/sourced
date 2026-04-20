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
  Search,
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
  const [customPantryItems, setCustomPantryItems] = useState<string[]>([]);
  const [pantrySearch, setPantrySearch] = useState('');
  const [newPantryItem, setNewPantryItem] = useState('');
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string>('');
  const [storeAddress, setStoreAddress] = useState<string>('');
  const [storeError, setStoreError] = useState('');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<{ storeId: string; name: string; address: string; town: string }[]>([]);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
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

  // Hydrate pantry state from localStorage (client-only, runs once)
  useEffect(() => {
    const savedOverrides = localStorage.getItem('pantry-overrides');
    const savedCustom = localStorage.getItem('pantry-custom-items');
    if (savedOverrides) setOverriddenPantry(JSON.parse(savedOverrides));
    if (savedCustom) setCustomPantryItems(JSON.parse(savedCustom));
    setPantryLoaded(true);
  }, []);

  // Persist pantry state to localStorage (skip until hydration is done)
  useEffect(() => {
    if (!pantryLoaded) return;
    localStorage.setItem('pantry-overrides', JSON.stringify(overriddenPantry));
  }, [overriddenPantry, pantryLoaded]);

  useEffect(() => {
    if (!pantryLoaded) return;
    localStorage.setItem('pantry-custom-items', JSON.stringify(customPantryItems));
  }, [customPantryItems, pantryLoaded]);

  // Resolve store ID → name + address
  useEffect(() => {
    fetch(`/api/store?storeId=${storeId}`)
      .then((r) => r.json())
      .then((d) => { if (d.name) { setStoreName(d.name.replace('Hemköp ', '')); setStoreAddress(d.address); } })
      .catch(() => {});
  }, [storeId]);

  // Pre-warm store cache when modal opens
  useEffect(() => {
    if (storeExpanded) fetch('/api/stores?q=a').catch(() => {});
  }, [storeExpanded]);

  // Debounced store search
  useEffect(() => {
    if (storeSearchQuery.length < 2) { setStoreSearchResults([]); return; }
    const timer = setTimeout(() => {
      setStoreSearchLoading(true);
      fetch(`/api/stores?q=${encodeURIComponent(storeSearchQuery)}`)
        .then((r) => r.json())
        .then((d) => setStoreSearchResults(d.stores ?? []))
        .catch(() => setStoreSearchResults([]))
        .finally(() => setStoreSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [storeSearchQuery]);

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

  const CATEGORY_DISPLAY: Record<string, { emoji: string; label: string }> = {
    kryddor: { emoji: '🧂', label: 'Kryddor & smaksättare' },
    matfett: { emoji: '🫒', label: 'Matfett & oljor' },
    bas_torrvaror: { emoji: '🌾', label: 'Torrvaror' },
    kolhydrater: { emoji: '🍝', label: 'Kolhydrater' },
    saser_smaksattare: { emoji: '🫙', label: 'Såser & smaksättare' },
    buljong: { emoji: '🍲', label: 'Buljong & fond' },
    mejeri_bas: { emoji: '🥚', label: 'Mejeri' },
    grönsaker_bas: { emoji: '🧅', label: 'Grönsaker' },
    konserver: { emoji: '🥫', label: 'Konserver' },
  };

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
  const NON_FOOD_CATS = new Set(['hem-och-hushall', 'blommor-och-tillbehor', 'hushall', 'hygien', 'djur', 'halsa-och-skonhet', 'barn']);
  const CATEGORY_ORDER = [
    'kott-fagel-och-chark',
    'fisk-och-skaldjur',
    'mejeri-ost-och-agg',
    'frukt-och-gront',
    'skafferi',
    'fardigmat',
    'vegetariskt',
    'brod-och-kakor',
    'fryst',
    'dryck',
    'godis-snacks-och-glass',
    'delikatessen',
  ];

  const normalizedDeals = deals.map((d) => ({
    ...d,
    category: (d.category || '').trim().toLowerCase(),
  }));

  const availableCategories = Array.from(
    new Set(
      normalizedDeals
        .map((d) => d.category)
        .filter(
          (c): c is string => !!c && !NON_FOOD_CATS.has(c)
        )
    )
  ).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  useEffect(() => {
    if (activeCategory !== 'all' && !availableCategories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [activeCategory, availableCategories]);

  const filteredDeals = activeCategory === 'all'
    ? normalizedDeals
    : normalizedDeals.filter((d) => d.category === activeCategory);

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
                <div className="fixed top-[60px] right-3 bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl whitespace-nowrap z-[200] shadow-lg pointer-events-none">
                  {t('pantryTooltip')}
                  <div className="absolute -top-1 right-7 w-2 h-2 bg-gray-900 rotate-45" />
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
              onClick={() => { setStoreExpanded((v) => !v); setStoreSearchQuery(''); setStoreSearchResults([]); setStoreError(''); }}
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
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setStoreExpanded(false); setStoreSearchQuery(''); setStoreSearchResults([]); } }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Byt butik</h3>
                {storeName && <p className="text-sm text-gray-500 mt-0.5">Nu: {storeName}</p>}
              </div>
              <button
                onClick={() => { setStoreExpanded(false); setStoreSearchQuery(''); setStoreSearchResults([]); }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 pt-5 pb-6">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={storeSearchQuery}
                  onChange={(e) => { setStoreSearchQuery(e.target.value); setStoreError(''); }}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Sök stad eller butik…"
                  autoFocus
                />
                {storeSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                )}
              </div>

              {/* Fixed-height results area — never resizes the modal */}
              <div className="mt-3 h-56 overflow-y-auto rounded-xl border border-gray-200">
                {storeSearchResults.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {storeSearchResults.map((s) => (
                      <li key={s.storeId}>
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                          onClick={() => {
                            setStoreId(s.storeId);
                            fetchDeals();
                            setStoreExpanded(false);
                            setStoreSearchQuery('');
                            setStoreSearchResults([]);
                          }}
                        >
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                            {(s.address || s.town) && (
                              <p className="text-xs text-gray-500">{[s.address, s.town].filter(Boolean).join(', ')}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-gray-400">
                      {storeSearchQuery.length < 2 ? 'Skriv för att söka…' : storeSearchLoading ? '' : 'Inga butiker hittades'}
                    </p>
                  </div>
                )}
              </div>

              {storeError && <p className="text-xs text-red-500 mt-2">{storeError}</p>}
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
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-fade-in-up">

            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t('pantryTitle')}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t('pantryDesc')}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {overriddenPantry.length > 0 && (
                    <button
                      onClick={() => setOverriddenPantry([])}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      {t('pantryResetAll')}
                    </button>
                  )}
                  <button
                    onClick={() => { setShowPantry(false); setPantrySearch(''); setNewPantryItem(''); }}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={pantrySearch}
                  onChange={(e) => setPantrySearch(e.target.value)}
                  placeholder={t('pantrySearch')}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {pantrySearch && (
                  <button onClick={() => setPantrySearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">

              {/* Category sections */}
              {Object.entries(pantryData.categories).map(([key, cat]) => {
                const filtered = pantrySearch
                  ? cat.items.filter((item) => item.toLowerCase().includes(pantrySearch.toLowerCase()))
                  : cat.items;
                if (filtered.length === 0) return null;
                const meta = CATEGORY_DISPLAY[key] ?? { emoji: '📦', label: cat.name };
                return (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">{meta.emoji}</span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{meta.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filtered.map((item) => {
                        const isOut = overriddenPantry.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => togglePantryOverride(item)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                              isOut
                                ? 'bg-white border-gray-100 text-gray-300 line-through'
                                : 'bg-sage-light border-sage/30 text-gray-700 hover:border-sage/60'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Custom items */}
              {(!pantrySearch || customPantryItems.some((i) => i.toLowerCase().includes(pantrySearch.toLowerCase()))) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">✨</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{t('pantryCustomSection')}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {customPantryItems
                      .filter((i) => !pantrySearch || i.toLowerCase().includes(pantrySearch.toLowerCase()))
                      .map((item) => (
                        <button
                          key={item}
                          onClick={() => setCustomPantryItems((prev) => prev.filter((i) => i !== item))}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-coral-light border border-coral/20 text-coral hover:bg-red-50 hover:border-red-200 hover:text-red-400 transition-all group active:scale-95"
                        >
                          {item}
                          <X className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                        </button>
                      ))}
                  </div>

                  {!pantrySearch && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPantryItem}
                        onChange={(e) => setNewPantryItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = newPantryItem.trim().toLowerCase();
                            if (val && !customPantryItems.includes(val)) setCustomPantryItems((prev) => [...prev, val]);
                            setNewPantryItem('');
                          }
                        }}
                        placeholder={t('pantryAddPlaceholder')}
                        className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                      <button
                        onClick={() => {
                          const val = newPantryItem.trim().toLowerCase();
                          if (val && !customPantryItems.includes(val)) setCustomPantryItems((prev) => [...prev, val]);
                          setNewPantryItem('');
                        }}
                        disabled={!newPantryItem.trim()}
                        className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-gray-800 transition-colors"
                      >
                        {t('pantryAddItem')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => { setShowPantry(false); setPantrySearch(''); setNewPantryItem(''); }}
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
                userHasItems={Array.from(new Set([...userHasItems, ...customPantryItems]))}
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
