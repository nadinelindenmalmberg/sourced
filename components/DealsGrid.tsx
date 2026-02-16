'use client';

import type { Deal } from '@/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface DealsGridProps {
  deals: Deal[];
  selectedIngredients: string[];
  onToggleIngredient: (name: string) => void;
  loading?: boolean;
}

// Categories to filter out (non-food items)
const NON_FOOD_CATEGORIES = ['Hushåll', 'Djur', 'Hälsa', 'Hygien', 'Städning'];

export default function DealsGrid({ deals, selectedIngredients, onToggleIngredient, loading }: DealsGridProps) {
  // Filter out non-food items
  const foodDeals = deals.filter(deal => {
    const category = deal.category?.toLowerCase() || '';
    return !NON_FOOD_CATEGORIES.some(nonFood => 
      category.includes(nonFood.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-muted-foreground">Laddar erbjudanden...</span>
      </div>
    );
  }

  if (foodDeals.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">Inga erbjudanden hittades just nu</p>
          <Button
            onClick={() => window.location.reload()}
            variant="default"
          >
            Försök igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {foodDeals.map((deal) => {
        const isSelected = selectedIngredients.includes(deal.name);
        
        return (
          <Card
            key={deal.id}
            onClick={() => onToggleIngredient(deal.name)}
            className={`
              cursor-pointer transition-all active:scale-95 touch-manipulation hover:shadow-lg
              ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
          >
            {/* Product Image */}
            {deal.image ? (
              <div className="relative w-full h-40 sm:h-48 bg-muted rounded-t-lg overflow-hidden">
                <Image
                  src={deal.image}
                  alt={deal.name}
                  fill
                  className="object-contain"
                  unoptimized
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onError={(e) => {
                    // Hide image on error
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.parentElement) {
                      target.parentElement.style.display = 'none';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-40 sm:h-48 bg-muted rounded-t-lg flex items-center justify-center">
                <span className="text-muted-foreground text-xs sm:text-sm">Ingen bild</span>
              </div>
            )}
            
            {/* Product Info */}
            <CardContent className="p-2 sm:p-4">
              {deal.brand && (
                <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{deal.brand}</p>
              )}
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 text-sm sm:text-base leading-tight">
                {deal.name}
              </h3>
              
              {/* Price and Promotion */}
              <div className="flex flex-col gap-1">
                {deal.promotion ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge variant="destructive" className="text-xs font-bold">
                        KAMPANJ
                      </Badge>
                      <span className="text-base sm:text-lg font-bold text-destructive">
                        {deal.promotion}
                      </span>
                    </div>
                    {deal.price > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Vanligt: {deal.price} kr/{deal.unit}
                      </span>
                    )}
                  </div>
                ) : (
                  deal.price > 0 && (
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {deal.price} kr/{deal.unit}
                    </span>
                  )
                )}
              </div>
              
              {isSelected && (
                <Badge variant="default" className="mt-2 text-xs sm:text-sm">
                  ✓ Vald
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
