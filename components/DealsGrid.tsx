'use client';

import { Deal } from '../app/api/deals/route';
import Image from 'next/image';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Laddar erbjudanden...</span>
      </div>
    );
  }

  if (foodDeals.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">Inga erbjudanden hittades just nu</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {foodDeals.map((deal) => {
        const isSelected = selectedIngredients.includes(deal.name);
        
        return (
          <div
            key={deal.id}
            onClick={() => onToggleIngredient(deal.name)}
            className={`
              bg-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95 touch-manipulation
              ${isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''}
            `}
          >
            {/* Product Image */}
            {deal.image ? (
              <div className="relative w-full h-40 sm:h-48 bg-gray-100 rounded-t-xl overflow-hidden">
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
              <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-t-xl flex items-center justify-center">
                <span className="text-gray-400 text-xs sm:text-sm">Ingen bild</span>
              </div>
            )}
            
            {/* Product Info */}
            <div className="p-2 sm:p-4">
              {deal.brand && (
                <p className="text-xs text-gray-500 mb-1 line-clamp-1">{deal.brand}</p>
              )}
              <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 text-sm sm:text-base leading-tight">
                {deal.name}
              </h3>
              
              {/* Price and Promotion */}
              <div className="flex flex-col gap-1">
                {deal.promotion ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                        KAMPANJ
                      </span>
                      <span className="text-base sm:text-lg font-bold text-red-600">
                        {deal.promotion}
                      </span>
                    </div>
                    {deal.price > 0 && (
                      <span className="text-xs text-gray-500">
                        Vanligt: {deal.price} kr/{deal.unit}
                      </span>
                    )}
                  </div>
                ) : (
                  deal.price > 0 && (
                    <span className="text-base sm:text-lg font-bold text-gray-700">
                      {deal.price} kr/{deal.unit}
                    </span>
                  )
                )}
              </div>
              
              {isSelected && (
                <div className="mt-2 text-xs sm:text-sm text-green-600 font-medium">
                  ✓ Vald
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
