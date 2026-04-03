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
          <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
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

  return (
    <div className="space-y-8">
      {grouped.map(({ category, deals: groupDeals }) => (
        <div key={category}>
          {/* Category separator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full whitespace-nowrap">
              {prettyCategoryName(category)} <span className="text-gray-300 ml-0.5">{groupDeals.length}</span>
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className={GRID}>
            {groupDeals.map((deal) => {
              const isSelected = selectedIngredients.includes(deal.name);
              return (
                <button
                  key={deal.id}
            onClick={() => onToggleIngredient(deal.name)}
            className={`
              group relative text-left rounded-2xl border-2 transition-all duration-150 active:scale-95 overflow-hidden bg-white
              ${isSelected
                ? 'border-coral shadow-md bg-coral-light'
                : 'border-gray-100 hover:border-gray-300'
              }
            `}
          >
            {/* Image */}
            <div className="relative w-full aspect-[3/4] bg-gray-50">
              {deal.image ? (
                <Image
                  src={deal.image}
                  alt={deal.name}
                  fill
                  className="object-contain p-2"
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

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-coral flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2.5">
              {deal.brand && (
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5 truncate">{deal.brand}</p>
              )}
              <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1.5">{deal.name}</p>
              <div className="flex flex-col gap-0.5">
                {deal.comparePrice && (
                  <span className="text-[10px] text-gray-400 leading-tight">
                    Ord pris {deal.comparePrice}
                  </span>
                )}
                {deal.promotion ? (
                  <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full self-start">
                    {deal.promotion}
                  </span>
                ) : deal.price > 0 ? (
                  <span className="text-xs font-semibold text-gray-700">
                    {deal.price} kr/{deal.unit}
                  </span>
                ) : null}
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
