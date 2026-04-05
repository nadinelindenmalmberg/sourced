'use client';

import type { Deal } from '@/types';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n-context';

interface DealsGridProps {
  deals: Deal[];
  selectedIngredients: string[];
  onToggleIngredient: (name: string) => void;
  loading?: boolean;
}

const NON_FOOD_CATEGORIES = ['Hushåll', 'Djur', 'Hälsa', 'Hygien', 'Städning'];

const CATEGORY_LABELS: Record<string, string> = {
  'brod-och-kakor': 'Bröd och kakor',
  'delikatessen': 'Delikatessen',
  'dryck': 'Dryck',
  'fardigmat': 'Färdigmat',
  'fisk-och-skaldjur': 'Fisk och skaldjur',
  'frukt-och-gront': 'Frukt och grönt',
  'fryst': 'Fryst',
  'godis-snacks-och-glass': 'Godis, snacks och glass',
  'hem-och-hushall': 'Hem och hushåll',
  'kott-fagel-och-chark': 'Kött, fågel och chark',
  'mejeri-ost-och-agg': 'Mejeri, ost och ägg',
  'skafferi': 'Skafferi',
  'vegetariskt': 'Vegetariskt',
  'blommor-och-tillbehor': 'Blommor och tillbehör',
};

function prettyCategoryName(raw: string): string {
  if (CATEGORY_LABELS[raw]) return CATEGORY_LABELS[raw];
  return raw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DealsGrid({ deals, selectedIngredients, onToggleIngredient, loading }: DealsGridProps) {
  const { t } = useLanguage();

  const foodDeals = deals.filter((deal) => {
    const category = deal.category?.toLowerCase() || '';
    return !NON_FOOD_CATEGORIES.some((nf) => category.includes(nf.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-shimmer aspect-[3/4]" />
        ))}
      </div>
    );
  }

  if (foodDeals.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">{t('noDeals')}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          {t('tryAgain')}
        </button>
      </div>
    );
  }

  // Group by top-level category, preserving insertion order
  const grouped = foodDeals.reduce<{ category: string; deals: Deal[] }[]>((acc, deal) => {
    const cat = deal.category?.trim() || 'Övrigt';
    const existing = acc.find((g) => g.category === cat);
    if (existing) {
      existing.deals.push(deal);
    } else {
      acc.push({ category: cat, deals: [deal] });
    }
    return acc;
  }, []);

  const GRID = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';

  const showHeaders = grouped.length > 1;

  return (
    <div className="space-y-8">
      {grouped.map(({ category, deals: groupDeals }) => (
        <div key={category}>
          {/* Category separator — hidden when only one category is shown */}
          {showHeaders && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-full whitespace-nowrap">
                {prettyCategoryName(category)} <span className="text-gray-400 ml-0.5">{groupDeals.length}</span>
              </span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          )}
          <div className={GRID}>
            {groupDeals.map((deal, index) => {
              const isSelected = selectedIngredients.includes(deal.name);
              return (
                <button
                  key={deal.id}
                  onClick={() => onToggleIngredient(deal.name)}
                  className={`
                    group relative text-left rounded-2xl border-2 transition-all duration-200 active:scale-[0.97] overflow-hidden
                    ${isSelected
                      ? 'border-coral shadow-lg shadow-coral/15 bg-coral-light ring-1 ring-coral/20'
                      : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }
                  `}
                  style={{ animationDelay: `${(index % 6) * 50}ms` }}
                >
                  {/* Image */}
                  <div className={`relative w-full aspect-[3/4] ${isSelected ? 'bg-coral-light' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
                    {deal.image ? (
                      <Image
                        src={deal.image}
                        alt={deal.name}
                        fill
                        className="object-contain p-3 transition-transform duration-200 group-hover:scale-105"
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          if (t.parentElement) t.parentElement.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-300 text-xs">{t('noImage')}</span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-coral flex items-center justify-center shadow-md animate-fade-in-up">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    {deal.brand && (
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 truncate">{deal.brand}</p>
                    )}
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-2">{deal.name}</p>
                    <div className="flex flex-col gap-0.5">
                      {deal.price > 0 && (
                        <span className="text-[11px] text-gray-400 leading-tight">
                          Ord pris: {deal.price} kr/{deal.unit}
                        </span>
                      )}
                      {deal.comparePrice && (
                        <span className="text-[11px] text-red-500 font-semibold leading-tight">
                          Erbj. Jmf pris: {deal.comparePrice}
                        </span>
                      )}
                      {deal.promotion && (
                        <span className="text-l font-bold text-coral bg-coral-light border border-coral/20 px-2.5 py-0.5 rounded-full self-start mt-0.5">
                          {deal.promotion}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
