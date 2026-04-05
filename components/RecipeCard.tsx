'use client';

import type { MatchedRecipe, GeneratedRecipe } from '@/types';
import { getDifficultyColor, getDifficultyText } from '@/lib/recipe-utils';
import { useLanguage } from '@/lib/i18n-context';
import { Clock, Users, Sparkles } from 'lucide-react';
import pantryData from '@/data/pantry.json';

interface NormalizedIngredient {
  name: string;
  amount: string;
  onSale: boolean;
  atHome: boolean;
}

interface RecipeCardProps {
  matched?: MatchedRecipe;
  generated?: GeneratedRecipe;
  overriddenPantry: string[];
  onTogglePantry: (name: string) => void;
  userHasItems: string[];
  onToggleUserHas: (name: string) => void;
}

const allPantryItems = pantryData.all_items_flat;

function isInPantry(name: string): boolean {
  const n = name.toLowerCase();
  return allPantryItems.some(
    (item) => n.includes(item.toLowerCase()) || item.toLowerCase().includes(n)
  );
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').trim();

function ingMatchesDeal(ingName: string, dealName: string): boolean {
  // Strip parentheticals (e.g. "(färdigköpta)") before matching
  const nd = norm(dealName).replace(/\(.*?\)/g, '').trim();
  const ni = norm(ingName).replace(/\(.*?\)/g, '').trim();
  if (nd.includes(ni) || ni.includes(nd)) return true;
  for (const dw of nd.split(/\s+/))
    for (const iw of ni.split(/\s+/))
      if (dw.length > 2 && iw.length > 2 &&
        (dw.startsWith(iw) || iw.startsWith(dw) || dw.endsWith(iw) || iw.endsWith(dw)))
        return true;
  return false;
}

function stripRecept(q: string) {
  return q.replace(/\brecept\b/gi, '').trim();
}

function normalizeIngredients(
  matched?: MatchedRecipe,
  generated?: GeneratedRecipe,
  overriddenPantry: string[] = [],
  userHasItems: string[] = []
): NormalizedIngredient[] {
  const isAtHome = (name: string) =>
    ((isInPantry(name) && !overriddenPantry.includes(name)) || userHasItems.includes(name));

  if (matched) {
    return matched.all_ingredients.map((ing) => {
      const displayName = ing.name.replace(/\s*\(.*?\)/g, '').trim();
      const atHome = isAtHome(ing.name);
      const onSale = !atHome && matched.matched_deals.some((d) => ingMatchesDeal(ing.name, d));
      return { name: displayName, amount: ing.amount, onSale, atHome };
    });
  }

  if (generated) {
    return generated.ingredients.map((ing) => {
      if (typeof ing === 'string') return { name: ing, amount: '', onSale: false, atHome: isAtHome(ing) };
      const atHome = isAtHome(ing.item) && !ing.from_deal;
      return { name: ing.item, amount: ing.amount, onSale: !!ing.from_deal, atHome };
    });
  }

  return [];
}

export default function RecipeCard({ matched, generated, overriddenPantry, onTogglePantry, userHasItems, onToggleUserHas }: RecipeCardProps) {
  const { t } = useLanguage();

  const isAI = !!generated;
  const title = matched?.name ?? generated?.title ?? '';
  const description = matched?.description ?? generated?.description;
  const difficulty = matched?.difficulty ?? generated?.difficulty;
  const time = matched?.time_minutes ?? generated?.time_minutes;
  const servings = matched?.servings ?? generated?.servings;
  const instructions = matched?.instructions ?? generated?.instructions ?? [];
  const tips = matched?.tips ?? generated?.tips;
  const searchQuery = matched?.search_query ?? generated?.search_query ?? '';

  const ingredients = normalizeIngredients(matched, generated, overriddenPantry, userHasItems);
  const onSaleItems = ingredients.filter((i) => i.onSale);
  const toBuyItems = ingredients.filter((i) => !i.onSale && !i.atHome);
  const atHomeItems = ingredients.filter((i) => i.atHome);

  const linkBtnClass = 'text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-full transition-all active:scale-[0.97]';

  return (
    <div className="rounded-3xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {isAI && (
            <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />{t('aiGenerated')}
            </span>
          )}
          {difficulty && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border border-gray-200 ${getDifficultyColor(difficulty)}`}>
              {getDifficultyText(difficulty)}
            </span>
          )}
          {time != null && (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />{time} {t('minutes')}
            </span>
          )}
          {servings != null && (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <Users className="w-3 h-3" />{servings} {t('servings')}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>

      {/* Ingredients — unified 3-section layout */}
      <div className="px-6 py-5 space-y-5">
        <div className="space-y-3">
          {onSaleItems.length > 0 && (
            <div className="rounded-2xl bg-sage-light border border-sage/30 overflow-hidden">
              <div className="px-4 py-2 border-b border-sage/20 flex items-center gap-1.5">
                <span className="text-base">🏷️</span>
                <span className="text-xs font-bold text-sage-dark">{t('onSale')}</span>
              </div>
              <ul className="divide-y divide-sage/10">
                {onSaleItems.map((ing, i) => (
                  <li key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">{ing.name}</span>
                    <span className="text-xs font-semibold text-sage-dark">{ing.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {toBuyItems.length > 0 && (
            <div className="rounded-2xl bg-amber-50/60 border border-amber-200/60 overflow-hidden">
              <div className="px-4 py-2 border-b border-amber-200/60 flex items-center gap-1.5">
                <span className="text-base">🛒</span>
                <span className="text-xs font-bold text-amber-700">{t('toBuy')}</span>
                <span className="text-[10px] text-amber-500/70 ml-auto">{t('tapToToggle')}</span>
              </div>
              <ul className="divide-y divide-amber-100/60">
                {toBuyItems.map((ing, i) => (
                  <li key={i}>
                    <button
                      onClick={() => onToggleUserHas(ing.name)}
                      className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-amber-100/40 transition-colors text-left"
                    >
                      <span className="text-sm text-gray-800">{ing.name}</span>
                      <span className="text-xs text-gray-400">{ing.amount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {atHomeItems.length > 0 && (
            <div className="rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1.5">
                <span className="text-base">🏠</span>
                <span className="text-xs font-bold text-gray-500">{t('atHome')}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{t('tapToToggle')}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {atHomeItems.map((ing, i) => (
                  <li key={i}>
                    <button
                      onClick={() => onTogglePantry(ing.name)}
                      className="w-full px-4 py-2.5 flex justify-between items-center hover:bg-gray-100 transition-colors text-left"
                    >
                      <span className="text-sm text-gray-400">{ing.name}</span>
                      <span className="text-xs text-gray-300">{ing.amount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100" />

        {/* Instructions */}
        <div>
          <h4 className="text-sm font-bold text-gray-900 mb-3">{t('instructions')}</h4>
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-coral flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {tips && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="bg-coral-light border border-coral/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-coral">
                💡 {t('tips')}: <span className="font-normal">{tips}</span>
              </p>
            </div>
          </>
        )}

        {searchQuery && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.ica.se/recept/?q=${encodeURIComponent(stripRecept(searchQuery))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkBtnClass}
              >
                {isAI ? t('similarOnICA') : t('findOnICA')}
              </a>
              <a
                href={`https://www.koket.se/search?searchtext=${encodeURIComponent(stripRecept(searchQuery))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={linkBtnClass}
              >
                {isAI ? t('similarOnKoket') : t('findOnKoket')}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
