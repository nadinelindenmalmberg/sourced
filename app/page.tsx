'use client';

import { useState, useEffect } from 'react';
import { Deal } from './api/deals/route';
import DealsGrid from '../components/DealsGrid';
import { ChefHat, Sparkles } from 'lucide-react';
import { recommendBestSelection } from './utils/randomSelection';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  search_query: string;
}

interface RecipeResponse {
  recipes: Recipe[];
}

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [storeId, setStoreId] = useState('4547');
  const [error, setError] = useState<string | null>(null);
  const [recommendationInfo, setRecommendationInfo] = useState<string[] | null>(null);

  // Fetch deals on mount
  useEffect(() => {
    fetchDeals();
  }, [storeId]);

  const fetchDeals = async () => {
    setLoadingDeals(true);
    setError(null);
    try {
      const response = await fetch(`/api/deals?storeId=${storeId}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setDeals([]);
      } else if (data.deals && data.deals.length > 0) {
        setDeals(data.deals);
        console.log(`✅ Loaded ${data.deals.length} deals from ${data.source || 'API'}`);
      } else {
        setError('Inga erbjudanden hittades');
        setDeals([]);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      setError('Ett fel uppstod vid hämtning av erbjudanden');
      setDeals([]);
    } finally {
      setLoadingDeals(false);
    }
  };

  const toggleIngredient = (name: string) => {
    setSelectedIngredients(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSurpriseMe = async () => {
    if (deals.length === 0) {
      await fetchDeals();
      // Wait a bit for deals to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (deals.length === 0) {
        alert('Laddar erbjudanden... Försök igen om en sekund.');
        return;
      }
    }
    
    setLoading(true);
    setRecipes([]);

    // Deterministic “best” recommendation (not random)
    const rec = recommendBestSelection(deals);
    const chosen = rec.ingredients;
    setRecommendationInfo(rec.rationale);

    if (chosen.length === 0) {
      setLoading(false);
      alert('Inga ingredienser hittades. Försök igen senare.');
      return;
    }
    
    console.log('⭐ Recommended ingredients:', chosen);
    setSelectedIngredients(chosen);
    
    // Scroll to show selected items
    setTimeout(() => {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }, 300);
    
    // IMPORTANT: generate with the chosen list (don’t rely on async state)
    await generateRecipes(chosen);
  };

  const generateRecipes = async (ingredientsOverride?: string[]) => {
    const ingredientsToUse = ingredientsOverride ?? selectedIngredients;
    if (ingredientsToUse.length < 2) return;
    
    setLoading(true);
    setRecipes([]);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredientsToUse,
          // send deal context for better recommendations
          deals: deals
            .filter(d => ingredientsToUse.includes(d.name))
            .map(d => ({ name: d.name, promotion: d.promotion, price: d.price, unit: d.unit, category: d.category })),
        }),
      });
      
      const data: any = await response.json();
      
      if (data.error) {
        console.error('Error generating recipes:', data.error);
        alert('Kunde inte generera recept. Försök igen.');
      } else if (data.recipes && data.recipes.length > 0) {
        setRecipes(data.recipes);
        // Scroll to recipes
        setTimeout(() => {
          const recipeElement = document.getElementById('recipes');
          if (recipeElement) {
            recipeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        alert('Inga recept kunde genereras. Försök igen.');
      }
    } catch (error) {
      console.error('Error generating recipes:', error);
      alert('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-32 safe-bottom">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8 safe-left safe-right">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              Hemköp Chef
            </h1>
          </div>
          
          {/* Surprise Me Button */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
            <button
              onClick={handleSurpriseMe}
              disabled={loading || loadingDeals}
              className="w-full px-4 py-4 sm:px-6 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold active:from-purple-700 active:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-base sm:text-lg touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="text-sm sm:text-base">Rekommenderar &amp; genererar recept...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-center">⭐ Rekommendera recept</span>
                </>
              )}
            </button>
            <p className="mt-3 text-sm text-gray-700 text-center">
              Vi väljer en “bäst match”-korg (protein + tillbehör) från erbjudandena och skapar 3 recept.
            </p>
            {deals.length > 0 && (
              <p className="mt-1 text-xs text-gray-600 text-center">
                {deals.length} erbjudanden tillgängliga
              </p>
            )}
          </div>
          
          {/* Store Selector - Stack on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label htmlFor="storeId" className="text-gray-700 font-medium text-sm sm:text-base">
              Butik ID:
            </label>
            <div className="flex gap-2 flex-1">
              <input
                id="storeId"
                type="text"
                inputMode="numeric"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                onBlur={fetchDeals}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                placeholder="4547"
              />
              <button
                onClick={fetchDeals}
                disabled={loadingDeals}
                className="px-4 sm:px-4 py-3 sm:py-2 bg-gray-200 text-gray-700 rounded-lg active:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium touch-manipulation min-w-[100px]"
              >
                {loadingDeals ? 'Laddar...' : 'Uppdatera'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchDeals}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Försök igen
            </button>
          </div>
        )}

        {/* Selected Ingredients Summary */}
        {selectedIngredients.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-md border-2 border-green-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h2 className="text-lg sm:text-xl font-semibold">
                Valda Ingredienser ({selectedIngredients.length}):
              </h2>
              {selectedIngredients.length >= 2 && (
                <span className="px-3 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold self-start sm:self-auto">
                  Redo för recept!
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedIngredients.map((name, idx) => {
                // Check if this ingredient has a promotion
                const deal = deals.find(d => d.name === name);
                const hasPromotion = deal && deal.promotion && deal.promotion.length > 0;
                
                return (
                  <span
                    key={`${name}-${idx}`}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium touch-manipulation ${
                      hasPromotion 
                        ? 'bg-red-100 text-red-800 border-2 border-red-300' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {hasPromotion && '🔥 '}
                    <span className="break-words">{name}</span>
                    {hasPromotion && deal && ` (${deal.promotion})`}
                  </span>
                );
              })}
            </div>

            {recommendationInfo && recommendationInfo.length > 0 && (
              <div className="mt-3 p-3 bg-white/70 rounded-lg border border-green-200">
                <div className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">Varför dessa?</div>
                <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">
                  {recommendationInfo.slice(0, 6).map((r, i) => (
                    <li key={i} className="break-words">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedIngredients([]);
                setRecipes([]);
                setRecommendationInfo(null);
              }}
              className="mt-3 px-4 py-2 text-sm text-red-600 active:text-red-800 font-medium touch-manipulation"
            >
              Rensa val
            </button>
          </div>
        )}

        {/* Recipes Display */}
        {recipes.length > 0 && (
          <div id="recipes" className="mb-8">
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-2">
                ✨ Genererade Recept baserat på erbjudanden
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Här är {recipes.length} kreativa recept som använder ingredienser från kampanjer!
              </p>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {recipes.map((recipe, idx) => (
                <div key={idx} className="p-4 sm:p-6 bg-white rounded-xl shadow-lg border-2 border-blue-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{recipe.title}</h3>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs sm:text-sm font-medium self-start">
                      Recept {idx + 1}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-base sm:text-lg font-semibold mb-2">Ingredienser:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-gray-700 break-words">{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-base sm:text-lg font-semibold mb-2">Instruktioner:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base">
                      {recipe.instructions.map((step, i) => (
                        <li key={i} className="text-gray-700 break-words">{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(recipe.search_query)}+site:ica.se+OR+site:arla.se+OR+site:koket.se+OR+site:hemkop.se`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors text-sm sm:text-base touch-manipulation"
                    >
                      🔍 Hitta liknande recept på nätet
                    </a>
                    <a
                      href={`https://www.ica.se/recept/sok/?q=${encodeURIComponent(recipe.search_query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg active:bg-green-700 transition-colors text-sm sm:text-base touch-manipulation"
                    >
                      📖 Sök på ICA.se
                    </a>
                    <a
                      href={`https://www.koket.se/recept?q=${encodeURIComponent(recipe.search_query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg active:bg-orange-700 transition-colors text-sm sm:text-base touch-manipulation"
                    >
                      🍳 Sök på Koket.se
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">
            Erbjudanden ({deals.length})
          </h2>
        </div>

        <DealsGrid
          deals={deals}
          selectedIngredients={selectedIngredients}
          onToggleIngredient={toggleIngredient}
          loading={loadingDeals}
        />
      </div>

      {/* Floating Action Button - iPhone safe area aware */}
      <button
        onClick={() => generateRecipes()}
        disabled={selectedIngredients.length < 2 || loading}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 py-4 sm:px-6 sm:py-4 bg-blue-600 text-white rounded-full shadow-xl font-semibold active:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all active:scale-95 z-50 flex items-center gap-2 touch-manipulation safe-bottom"
        style={{ 
          marginBottom: 'max(1rem, env(safe-area-inset-bottom))',
          marginRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="text-sm sm:text-base">Genererar...</span>
          </>
        ) : (
          <>
            <ChefHat className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base whitespace-nowrap">
              Skapa Recept ({selectedIngredients.length})
            </span>
          </>
        )}
      </button>
    </main>
  );
}
