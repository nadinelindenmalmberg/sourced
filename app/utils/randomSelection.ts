import { Deal } from '../api/deals/route';

const NON_FOOD_KEYWORDS = [
  'tvätt', 'disk', 'blöjor', 'tandkräm', 'shampoo', 'balsam',
  'deodorant', 'tvål', 'toalettpapper', 'servetter', 'plast',
  'påsar', 'rengöring', 'städning', 'tvättmedel', 'mjukgörare',
  'blekmedel', 'tuggummi', 'godis', 'chips', 'läsk', 'soda'
];

const PRICE_THRESHOLD = 40; // SEK

/**
 * Filters out non-food items from the deals list
 */
function filterFoodItems(deals: Deal[]): Deal[] {
  return deals.filter(deal => {
    const nameLower = deal.name.toLowerCase();
    return !NON_FOOD_KEYWORDS.some(keyword => nameLower.includes(keyword));
  });
}

/**
 * Generates a random selection of ingredients using the price heuristic algorithm
 * @param deals - Array of all available deals
 * @returns Array of 4 selected deals (1 main + 3 sides, or 4 random if no mains available)
 */
export function generateRandomSelection(deals: Deal[]): Deal[] {
  // Filter out non-food items
  const foodItems = filterFoodItems(deals);
  
  if (foodItems.length === 0) {
    return [];
  }

  // Segment by price
  const mains = foodItems.filter(item => item.price > PRICE_THRESHOLD);
  const sides = foodItems.filter(item => item.price <= PRICE_THRESHOLD);

  const selected: Deal[] = [];

  // Pick 1 random main (high value item)
  if (mains.length > 0) {
    const randomMain = mains[Math.floor(Math.random() * mains.length)];
    selected.push(randomMain);
  }

  // Pick 3 random sides (or fill remaining slots if no mains)
  const sidesToPick = mains.length > 0 ? 3 : 4;
  const availableSides = [...sides];
  
  // Remove the main from sides if it was accidentally included
  if (selected.length > 0) {
    const mainIndex = availableSides.findIndex(
      side => side.name === selected[0].name && side.price === selected[0].price
    );
    if (mainIndex > -1) {
      availableSides.splice(mainIndex, 1);
    }
  }

  // Pick random sides
  for (let i = 0; i < sidesToPick && availableSides.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableSides.length);
    selected.push(availableSides[randomIndex]);
    availableSides.splice(randomIndex, 1);
  }

  // Fallback: if we don't have enough items, fill with random items from the general list
  if (selected.length < 4 && foodItems.length >= 4) {
    const remaining = 4 - selected.length;
    const availableItems = foodItems.filter(
      item => !selected.some(sel => sel.name === item.name && sel.price === item.price)
    );
    
    for (let i = 0; i < remaining && availableItems.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      selected.push(availableItems[randomIndex]);
      availableItems.splice(randomIndex, 1);
    }
  }

  return selected;
}
