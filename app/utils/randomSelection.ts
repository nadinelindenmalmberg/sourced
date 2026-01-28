import { Deal } from '../api/deals/route';

const NON_FOOD_KEYWORDS = [
  'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
  'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
  'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare',
  'blekmedel',
];

const NON_FOOD_CATEGORIES = ['Hushåll', 'Djur', 'Hälsa', 'Hygien', 'Städning'];

// Penalize “not dinner” items hard so recommendation feels useful.
const SNACK_DESSERT_KEYWORDS = [
  'munk', 'kaka', 'kakor', 'bull', 'bulle', 'bakelse', 'tårta', 'choklad',
  'godis', 'chips', 'läsk', 'juice', 'lemonad', 'energidryck', 'glass',
];

type DealRole = 'protein' | 'veg' | 'carb' | 'sauce_dairy' | 'other';

function isNonFood(deal: Deal): boolean {
  const category = deal.category?.toLowerCase() || '';
  if (NON_FOOD_CATEGORIES.some((c) => category.includes(c.toLowerCase()))) return true;
  const nameLower = deal.name.toLowerCase();
  return NON_FOOD_KEYWORDS.some((k) => nameLower.includes(k));
}

function guessRole(deal: Deal): DealRole {
  const n = deal.name.toLowerCase();
  const c = (deal.category || '').toLowerCase();

  if (
    n.includes('kyck') || n.includes('lax') || n.includes('fisk') || n.includes('torsk') ||
    n.includes('räk') || n.includes('kött') || n.includes('färs') || n.includes('bacon') ||
    n.includes('korv') || n.includes('fläsk') || n.includes('filé') ||
    c.includes('fisk') || c.includes('kött')
  ) return 'protein';

  if (
    n.includes('potatis') || n.includes('ris') || n.includes('pasta') || n.includes('nudel') ||
    n.includes('tortilla') || n.includes('bröd') || n.includes('wrap') ||
    c.includes('torrvaror')
  ) return 'carb';

  if (
    n.includes('grädd') || n.includes('crème') || n.includes('creme') || n.includes('ost') ||
    n.includes('mjölk') || n.includes('smör') || n.includes('yogh') ||
    n.includes('sås') || n.includes('buljong') || n.includes('fond')
  ) return 'sauce_dairy';

  if (
    n.includes('lök') || n.includes('vitlök') || n.includes('paprika') || n.includes('tomat') ||
    n.includes('gurk') || n.includes('morot') || n.includes('broccoli') || n.includes('blomkål') ||
    n.includes('svamp') || n.includes('champ') || n.includes('spenat') || n.includes('sallad') ||
    c.includes('grön') || c.includes('frukt') // fruit is imperfect but better than “other”
  ) return 'veg';

  return 'other';
}

function scoreDeal(deal: Deal): number {
  const n = deal.name.toLowerCase();
  const role = guessRole(deal);

  let score = 0;

  // Base: things that can become dinner.
  if (role === 'protein') score += 120;
  if (role === 'carb') score += 60;
  if (role === 'veg') score += 55;
  if (role === 'sauce_dairy') score += 45;
  if (role === 'other') score += 10;

  // Penalize fika/snacks.
  if (SNACK_DESSERT_KEYWORDS.some((k) => n.includes(k))) score -= 140;

  // Prefer items with meaningful “promotion” text (they all have it, but some are more meal-like anyway).
  if (deal.promotion && deal.promotion.trim().length > 0) score += 10;

  // Prefer mid/high price proteins (often “main”).
  if (role === 'protein') score += Math.min(40, Math.max(0, deal.price - 30));

  // Avoid weird items with price 0.
  if (!deal.price || deal.price <= 0) score -= 50;

  return score;
}

export interface Recommendation {
  ingredients: string[];
  pickedDeals: Deal[];
  rationale: string[];
}

/**
 * Deterministic “best recommendation” from the current deals list.
 * Picks a coherent set for cooking: protein + carb + veg + sauce/dairy (then fills).
 */
export function recommendBestSelection(deals: Deal[]): Recommendation {
  const food = deals.filter((d) => !isNonFood(d));
  const sorted = [...food].sort((a, b) => scoreDeal(b) - scoreDeal(a));

  const picked: Deal[] = [];
  const rationale: string[] = [];
  const usedNames = new Set<string>();

  const pickBest = (role: DealRole) => {
    const candidate = sorted.find((d) => !usedNames.has(d.name) && guessRole(d) === role);
    if (!candidate) return;
    picked.push(candidate);
    usedNames.add(candidate.name);
    rationale.push(`${candidate.name}: ${role} (${candidate.promotion || `${candidate.price} kr/${candidate.unit}`})`);
  };

  // Core meal structure.
  pickBest('protein');
  pickBest('carb');
  pickBest('veg');
  pickBest('sauce_dairy');

  // Fill to 5-6 items with best remaining meal-like items.
  for (const d of sorted) {
    if (picked.length >= 6) break;
    if (usedNames.has(d.name)) continue;
    // Skip heavy snack/dessert unless we have almost nothing else.
    const n = d.name.toLowerCase();
    if (SNACK_DESSERT_KEYWORDS.some((k) => n.includes(k))) continue;
    picked.push(d);
    usedNames.add(d.name);
  }

  // Last resort: if still too small, allow anything food-like.
  for (const d of sorted) {
    if (picked.length >= 4) break;
    if (usedNames.has(d.name)) continue;
    picked.push(d);
    usedNames.add(d.name);
  }

  return {
    ingredients: picked.map((d) => d.name),
    pickedDeals: picked,
    rationale,
  };
}
