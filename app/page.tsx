'use client';

import { useState, useEffect } from 'react';
import { Deal } from './api/deals/route';
import DealsGrid from '../components/DealsGrid';
import { ChefHat, Sparkles, AlertCircle } from 'lucide-react';
import { recommendBestSelection } from './utils/randomSelection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any = { error: 'Okänt fel' };
      if (isJson) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('API returned non-JSON:', response.status, text.slice(0, 200));
        if (!response.ok) {
          data = { error: `Servern svarade med fel (${response.status}). Kontrollera att OPENAI_API_KEY är satt.` };
        }
      }

      if (data.error) {
        console.error('Error generating recipes:', data.error);
        alert(data.error || 'Kunde inte generera recept. Försök igen.');
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
    <main className="min-h-screen bg-background pb-32 safe-bottom">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8 safe-left safe-right">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ChefHat className="w-10 h-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Hemköp Chef
            </h1>
          </div>
          
          {/* Surprise Me Button */}
          <Card className="mb-4 sm:mb-6 border-2 border-primary/20 bg-card">
            <CardContent className="pt-6">
              <Button
                onClick={handleSurpriseMe}
                disabled={loading || loadingDeals}
                size="lg"
                className="w-full shadow-lg active:scale-95 touch-manipulation"
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
              </Button>
              <p className="mt-3 text-sm text-muted-foreground text-center">
              Vi väljer en “bäst match”-korg (protein + tillbehör) från erbjudandena och skapar 3 recept.
            </p>
            {deals.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground text-center">
                {deals.length} erbjudanden tillgängliga
              </p>
              )}
            </CardContent>
          </Card>
          
          {/* Store Selector - Stack on mobile */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label htmlFor="storeId" className="text-foreground font-medium text-sm sm:text-base">
                  Butik ID:
                </label>
                <div className="flex gap-2 flex-1">
                  <Input
                    id="storeId"
                    type="text"
                    inputMode="numeric"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    onBlur={fetchDeals}
                    className="flex-1 touch-manipulation"
                    placeholder="4547"
                  />
                  <Button
                    onClick={fetchDeals}
                    disabled={loadingDeals}
                    variant="secondary"
                    className="touch-manipulation min-w-[100px]"
                  >
                    {loadingDeals ? 'Laddar...' : 'Uppdatera'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{error}</span>
              <Button
                onClick={fetchDeals}
                variant="destructive"
                size="sm"
                className="w-fit"
              >
                Försök igen
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Ingredients Summary */}
        {selectedIngredients.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-2 border-primary/20 bg-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg sm:text-xl">
                  Valda Ingredienser ({selectedIngredients.length}):
                </CardTitle>
                {selectedIngredients.length >= 2 && (
                  <Badge className="self-start sm:self-auto">
                    Redo för recept!
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedIngredients.map((name, idx) => {
                  // Check if this ingredient has a promotion
                  const deal = deals.find(d => d.name === name);
                  const hasPromotion = deal && deal.promotion && deal.promotion.length > 0;
                  
                  return (
                    <Badge
                      key={`${name}-${idx}`}
                      variant={hasPromotion ? "destructive" : "default"}
                      className="touch-manipulation text-xs sm:text-sm"
                    >
                      {hasPromotion && '🔥 '}
                      <span className="break-words">{name}</span>
                      {hasPromotion && deal && ` (${deal.promotion})`}
                    </Badge>
                  );
                })}
              </div>

              {recommendationInfo && recommendationInfo.length > 0 && (
                <Card className="mt-3 bg-muted/50 border-border">
                  <CardContent className="pt-4">
                    <div className="text-xs sm:text-sm font-semibold text-foreground mb-1">Varför dessa?</div>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                      {recommendationInfo.slice(0, 6).map((r, i) => (
                        <li key={i} className="break-words">{r}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => {
                  setSelectedIngredients([]);
                  setRecipes([]);
                  setRecommendationInfo(null);
                }}
                variant="ghost"
                size="sm"
                className="mt-3 text-destructive hover:text-destructive touch-manipulation"
              >
                Rensa val
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recipes Display */}
        {recipes.length > 0 && (
          <div id="recipes" className="mb-8">
            <Card className="mb-4 sm:mb-6 border-2 border-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-xl sm:text-3xl">
                  ✨ Genererade Recept baserat på erbjudanden
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Här är {recipes.length} kreativa recept som använder ingredienser från kampanjer!
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="space-y-4 sm:space-y-6">
              {recipes.map((recipe, idx) => (
                <Card key={idx} className="border-2 border-primary/20 shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <CardTitle className="text-xl sm:text-2xl break-words">{recipe.title}</CardTitle>
                      <Badge variant="secondary" className="self-start">
                        Recept {idx + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-2">Ingredienser:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className="break-words">{ing}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-2">Instruktioner:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-muted-foreground">
                        {recipe.instructions.map((step, i) => (
                          <li key={i} className="break-words">{step}</li>
                        ))}
                      </ol>
                    </div>

                    <Separator />

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <Button
                        asChild
                        variant="default"
                        className="touch-manipulation"
                      >
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(recipe.search_query)}+site:ica.se+OR+site:arla.se+OR+site:koket.se+OR+site:hemkop.se`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🔍 Hitta liknande recept på nätet
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        className="touch-manipulation"
                      >
                        <a
                          href={`https://www.ica.se/recept/sok/?q=${encodeURIComponent(recipe.search_query)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📖 Sök på ICA.se
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="touch-manipulation"
                      >
                        <a
                          href={`https://www.koket.se/recept?q=${encodeURIComponent(recipe.search_query)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🍳 Sök på Koket.se
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Deals Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
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
      <Button
        onClick={() => generateRecipes()}
        disabled={selectedIngredients.length < 2 || loading}
        size="lg"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 rounded-full shadow-xl active:scale-95 z-50 flex items-center gap-2 touch-manipulation safe-bottom"
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
      </Button>
    </main>
  );
}
