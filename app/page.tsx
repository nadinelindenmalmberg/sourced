'use client';

import { useState, useEffect } from 'react';
import { Deal } from './api/deals/route';
import DealsGrid from '../components/DealsGrid';
import { ChefHat } from 'lucide-react';

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

  const generateRecipes = async () => {
    if (selectedIngredients.length < 2) return;
    
    setLoading(true);
    setRecipes([]);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: selectedIngredients,
        }),
      });
      
      const data: RecipeResponse = await response.json();
      
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-24">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              Hemköp Chef
            </h1>
          </div>
          
          {/* Store Selector */}
          <div className="flex items-center gap-4">
            <label htmlFor="storeId" className="text-gray-700 font-medium">
              Butik ID:
            </label>
            <input
              id="storeId"
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              onBlur={fetchDeals}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="4547"
            />
            <button
              onClick={fetchDeals}
              disabled={loadingDeals}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              {loadingDeals ? 'Laddar...' : 'Uppdatera'}
            </button>
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
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Valda Ingredienser ({selectedIngredients.length}):</h2>
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((name, idx) => (
                <span
                  key={`${name}-${idx}`}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
            <button
              onClick={() => setSelectedIngredients([])}
              className="mt-3 text-sm text-red-600 hover:text-red-800"
            >
              Rensa val
            </button>
          </div>
        )}

        {/* Recipes Display */}
        {recipes.length > 0 && (
          <div id="recipes" className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Genererade Recept</h2>
            <div className="space-y-6">
              {recipes.map((recipe, idx) => (
                <div key={idx} className="p-6 bg-white rounded-lg shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{recipe.title}</h3>
                  
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-2">Ingredienser:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-gray-700">{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-2">Instruktioner:</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {recipe.instructions.map((step, i) => (
                        <li key={i} className="text-gray-700">{step}</li>
                      ))}
                    </ol>
                  </div>

                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(recipe.search_query)}+site:ica.se+OR+site:arla.se+OR+site:koket.se`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔍 Hitta liknande recept på nätet
                  </a>
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

      {/* Floating Action Button */}
      <button
        onClick={generateRecipes}
        disabled={selectedIngredients.length < 2 || loading}
        className="fixed bottom-6 right-6 px-6 py-4 bg-blue-600 text-white rounded-full shadow-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 z-50 flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Genererar...</span>
          </>
        ) : (
          <>
            <ChefHat className="w-5 h-5" />
            <span>Skapa Recept ({selectedIngredients.length})</span>
          </>
        )}
      </button>
    </main>
  );
}
