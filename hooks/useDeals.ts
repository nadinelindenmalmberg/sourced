'use client';

import { useState, useCallback } from 'react';
import type { Deal } from '@/types';

export interface UseDealsResult {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  storeId: string;
  setStoreId: (id: string) => void;
  fetchDeals: (storeIdOverride?: string) => Promise<void>;
}

export function useDeals(initialStoreId = '4547'): UseDealsResult {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(initialStoreId);

  const fetchDeals = useCallback(async (storeIdOverride?: string) => {
    const id = storeIdOverride ?? storeId;
    setLoading(true);
    setError(null);
    try {
      // Respect Cache-Control from /api/deals (browser + CDN); use refresh=1 when forcing fresh.
      const response = await fetch(`/api/deals?storeId=${id}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setDeals([]);
      } else if (data.deals?.length > 0) {
        setDeals(data.deals);
      } else {
        setError('Inga erbjudanden hittades');
        setDeals([]);
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Kunde inte hämta erbjudanden');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  return {
    deals,
    loading,
    error,
    storeId,
    setStoreId,
    fetchDeals,
  };
}
