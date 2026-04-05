/**
 * Deal from Hemköp API (full shape for UI and API response).
 */
export interface Deal {
  id: string;
  name: string;
  brand: string;
  price: number;
  unit: string;
  promotion: string;
  rewardLabel?: string;
  image: string;
  category: string;
  comparePrice?: string;
}

/**
 * Minimal deal shape used when matching recipes (e.g. in API request body).
 * Only `name` is required for matching.
 */
export interface DealMatchInput {
  name: string;
  price?: number;
  unit?: string;
  promotion?: string;
  category?: string;
}
