import { Deal } from '../api/deals/route';

const NON_FOOD_KEYWORDS = [
  'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
  'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
  'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare',
  'blekmedel', 'tuggummi', 'godis', 'chips', 'läsk', 'soda'
];

const NON_FOOD_CATEGORIES = ['Hushåll', 'Djur', 'Hälsa', 'Hygien', 'Städning'];

const PRICE_THRESHOLD = 40; // SEK

/**
 * Filters out non-food items from the deals list
 */
function filterFoodItems(deals: Deal[]): Deal[] {
  return deals.filter(deal => {
    // Filter by category
    const category = deal.category?.toLowerCase() || '';
    const isNonFoodCategory = NON_FOOD_CATEGORIES.some(nonFood => 
      category.includes(nonFood.toLowerCase())
    );
    
    if (isNonFoodCategory) return false;
    
    // Filter by name keywords
    const nameLower = deal.name.toLowerCase();
    const isNonFoodKeyword = NON_FOOD_KEYWORDS.some(keyword => 
      nameLower.includes(keyword.toLowerCase())
    );
    
    return !isNonFoodKeyword;
  });
}

/**
 * Generates a random selection of ingredients using the price heuristic algorithm
 * @param deals - Array of all available deals
 * @returns Array of 4-6 selected deal names (1-2 mains + 3-4 sides)
 */
export function generateRandomSelection(deals: Deal[]): string[] {
  // Filter out non-food items
  const foodItems = filterFoodItems(deals);
  
  if (foodItems.length === 0) {
    return [];
  }

  // Segment by price
  const mains = foodItems.filter(item => item.price > PRICE_THRESHOLD);
  const sides = foodItems.filter(item => item.price <= PRICE_THRESHOLD);

  const selected: string[] = [];

  // Pick 1-2 random mains (high value items)
  const numMains = mains.length > 0 ? Math.min(2, Math.floor(Math.random() * 2) + 1) : 0;
  const availableMains = [...mains];
  
  for (let i = 0; i < numMains && availableMains.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableMains.length);
    selected.push(availableMains[randomIndex].name);
    availableMains.splice(randomIndex, 1);
  }

  // Pick 3-4 random sides (or fill remaining slots if no mains)
  const numSides = mains.length > 0 ? Math.min(4, Math.floor(Math.random() * 2) + 3) : 6;
  const availableSides = [...sides];
  
  // Remove any mains that were selected from sides list
  const selectedMainNames = new Set(selected);
  const filteredSides = availableSides.filter(side => !selectedMainNames.has(side.name));
  
  for (let i = 0; i < numSides && filteredSides.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * filteredSides.length);
    selected.push(filteredSides[randomIndex].name);
    filteredSides.splice(randomIndex, 1);
  }

  // Fallback: if we don't have enough items, fill with random items from the general list
  if (selected.length < 4 && foodItems.length >= 4) {
    const remaining = 4 - selected.length;
    const selectedSet = new Set(selected);
    const availableItems = foodItems.filter(
      item => !selectedSet.has(item.name)
    );
    
    for (let i = 0; i < remaining && availableItems.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      selected.push(availableItems[randomIndex].name);
      availableItems.splice(randomIndex, 1);
    }
  }

  return selected;
}

/**
 * Generates a smart selection focusing on items with promotions
 */
export function generatePromotionBasedSelection(deals: Deal[]): string[] {
  const foodItems = filterFoodItems(deals);
  
  if (foodItems.length === 0) {
    return [];
  }

  // Prioritize items with promotions
  const itemsWithPromotions = foodItems.filter(item => item.promotion && item.promotion.length > 0);
  const itemsWithoutPromotions = foodItems.filter(item => !item.promotion || item.promotion.length === 0);

  const selected: string[] = [];
  
  // Pick 2-3 items with promotions (these are likely the best deals)
  const numPromoItems = Math.min(3, itemsWithPromotions.length);
  const availablePromoItems = [...itemsWithPromotions];
  
  for (let i = 0; i < numPromoItems && availablePromoItems.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availablePromoItems.length);
    selected.push(availablePromoItems[randomIndex].name);
    availablePromoItems.splice(randomIndex, 1);
  }

  // Fill remaining slots with regular items (mix of mains and sides)
  const remaining = Math.max(2, 6 - selected.length);
  const selectedSet = new Set(selected);
  const availableItems = itemsWithoutPromotions.filter(item => !selectedSet.has(item.name));
  
  // Mix of price ranges
  const mains = availableItems.filter(item => item.price > PRICE_THRESHOLD);
  const sides = availableItems.filter(item => item.price <= PRICE_THRESHOLD);
  
  // Add 1 main if available
  if (mains.length > 0 && selected.length < 6) {
    const randomMain = mains[Math.floor(Math.random() * mains.length)];
    selected.push(randomMain.name);
  }
  
  // Fill rest with sides
  const needed = 6 - selected.length;
  for (let i = 0; i < needed && sides.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * sides.length);
    selected.push(sides[randomIndex].name);
    sides.splice(randomIndex, 1);
  }

  return selected.slice(0, 6); // Max 6 items
}
