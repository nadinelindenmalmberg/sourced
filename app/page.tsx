'use client';

import { useState, useEffect } from 'react';
import { Deal } from './api/deals/route';
import { generateRandomSelection } from './utils/randomSelection';

interface Recipe {
  recipe_title: string;
  ingredients_used: string[];
  omitted_ingredients: string[];
  instructions: string[];
  search_query: string;
}

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Deal[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());

  // Fetch deals on mount
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoadingDeals(true);
    try {
      const response = await fetch('/api/deals');
      const data = await response.json();
      if (data.deals) {
        setDeals(data.deals);
        // Log source for debugging
        if (data.source) {
          console.log(`Deals loaded from: ${data.source}`, data);
        }
        if (data.warning) {
          console.warn(data.warning);
        }
      } else if (data.error) {
        console.error('API Error:', data.error);
        alert(`Kunde inte ladda erbjudanden: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      alert('Ett fel uppstod vid hämtning av erbjudanden. Kontrollera konsolen för detaljer.');
    } finally {
      setLoadingDeals(false);
    }
  };

  const toggleIngredient = (deal: Deal) => {
    setSelectedIngredients(prev => {
      const exists = prev.find(d => d.name === deal.name && d.price === deal.price);
      if (exists) {
        return prev.filter(d => !(d.name === deal.name && d.price === deal.price));
      } else {
        return [...prev, deal];
      }
    });
    setHighlightedItems(new Set());
  };

  const handleRandomSelection = async () => {
    if (deals.length === 0) {
      await fetchDeals();
    }
    
    setLoadingRandom(true);
    setRecipe(null);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const randomSelection = generateRandomSelection(deals);
    setSelectedIngredients(randomSelection);
    
    // Highlight the selected items
    const highlightSet = new Set(randomSelection.map(d => `${d.name}-${d.price}`));
    setHighlightedItems(highlightSet);
    
    // Scroll to selected items after a brief delay
    setTimeout(() => {
      const firstSelected = document.querySelector('[data-selected="true"]');
      if (firstSelected) {
        firstSelected.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    setLoadingRandom(false);
    
    // Automatically generate recipe
    if (randomSelection.length > 0) {
      await generateRecipe(randomSelection);
    }
  };

  const generateRecipe = async (ingredients: Deal[]) => {
    if (ingredients.length === 0) return;
    
    setLoading(true);
    setRecipe(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredients.map(i => ({
            name: i.name,
            price: i.price,
          })),
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        console.error('Error generating recipe:', data.error);
        alert('Kunde inte generera recept. Försök igen.');
      } else {
        setRecipe(data);
        // Scroll to recipe
        setTimeout(() => {
          const recipeElement = document.getElementById('recipe');
          if (recipeElement) {
            recipeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecipe = () => {
    if (selectedIngredients.length > 0) {
      generateRecipe(selectedIngredients);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🛒 Hemköp Recept Generator
          </h1>
          <p className="text-gray-600">
            Välj ingredienser eller låt oss välja åt dig!
          </p>
        </div>

        {/* Button Group */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleCreateRecipe}
            disabled={selectedIngredients.length === 0 || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {loading ? 'Genererar...' : `Skapa Recept (${selectedIngredients.length})`}
          </button>
          
          <button
            onClick={handleRandomSelection}
            disabled={loadingRandom || loadingDeals}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg transform hover:scale-105"
          >
            {loadingRandom ? 'Väljer...' : '🎲 Chansa!'}
          </button>

          <button
            onClick={fetchDeals}
            disabled={loadingDeals}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            {loadingDeals ? 'Laddar...' : '🔄 Uppdatera Erbjudanden'}
          </button>
        </div>

        {/* Selected Ingredients Summary */}
        {selectedIngredients.length > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Valda Ingredienser:</h2>
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient, idx) => (
                <span
                  key={`${ingredient.name}-${ingredient.price}-${idx}`}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {ingredient.name} ({ingredient.price} kr)
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

        {/* Recipe Display */}
        {recipe && (
          <div id="recipe" className="mb-8 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{recipe.recipe_title}</h2>
            
            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">Ingredienser som används:</h3>
              <ul className="list-disc list-inside space-y-1">
                {recipe.ingredients_used.map((ing, idx) => (
                  <li key={idx} className="text-gray-700">{ing}</li>
                ))}
              </ul>
            </div>

            {recipe.omitted_ingredients.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded">
                <h3 className="text-lg font-semibold mb-1 text-yellow-800">Hoppade över:</h3>
                <ul className="list-disc list-inside">
                  {recipe.omitted_ingredients.map((ing, idx) => (
                    <li key={idx} className="text-yellow-700">{ing}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-semibold mb-2">Instruktioner:</h3>
              <ol className="list-decimal list-inside space-y-2">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="text-gray-700">{step}</li>
                ))}
              </ol>
            </div>

            <div className="mt-4">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(recipe.search_query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                🔍 Sök efter liknande recept
              </a>
            </div>
          </div>
        )}

        {/* Deals Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">
            Erbjudanden ({deals.length})
          </h2>
        </div>

        {loadingDeals ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Laddar erbjudanden...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600">Inga erbjudanden hittades. Klicka på "Uppdatera Erbjudanden" för att ladda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {deals.map((deal, idx) => {
              const isSelected = selectedIngredients.some(
                sel => sel.name === deal.name && sel.price === deal.price
              );
              const isHighlighted = highlightedItems.has(`${deal.name}-${deal.price}`);
              
              return (
                <div
                  key={`${deal.name}-${deal.price}-${idx}`}
                  data-selected={isSelected}
                  onClick={() => toggleIngredient(deal)}
                  className={`p-4 bg-white rounded-lg shadow-md cursor-pointer transition-all transform hover:scale-105 ${
                    isSelected ? 'ring-4 ring-blue-500' : ''
                  } ${
                    isHighlighted ? 'animate-pulse ring-4 ring-purple-500' : ''
                  }`}
                  onAnimationEnd={() => {
                    if (isHighlighted) {
                      setHighlightedItems(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(`${deal.name}-${deal.price}`);
                        return newSet;
                      });
                    }
                  }}
                >
                  <h3 className="font-semibold text-gray-800 mb-2">{deal.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">{deal.price} kr</span>
                    {deal.originalPrice && deal.originalPrice > deal.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {deal.originalPrice} kr
                      </span>
                    )}
                  </div>
                  {deal.discount && (
                    <span className="text-sm text-green-600 font-medium">
                      -{deal.discount}%
                    </span>
                  )}
                  {deal.category && (
                    <span className="text-xs text-gray-500 mt-1 block">{deal.category}</span>
                  )}
                  {isSelected && (
                    <div className="mt-2 text-sm text-blue-600 font-medium">✓ Vald</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
