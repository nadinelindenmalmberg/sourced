import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let storeCache: { storeId: string; name: string; address: string; town: string }[] | null = null;
let storeCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getAllStores() {
  if (storeCache && Date.now() - storeCacheTime < CACHE_TTL) return storeCache;

  const res = await fetch(
    'https://www.hemkop.se/axfood/rest/store?q=a&pageSize=500',
    { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } }
  );
  if (!res.ok) return [];

  const raw: unknown[] = await res.json();
  if (!Array.isArray(raw)) return [];

  storeCache = raw
    .map((s) => {
      const store = s as Record<string, unknown>;
      const addr = store.address as Record<string, unknown> | undefined;
      return {
        storeId: (store.storeId ?? '') as string,
        name: ((store.name as string) ?? '').replace('Hemköp ', ''),
        address: (addr?.formattedAddress ?? '') as string,
        town: (addr?.town ?? '') as string,
      };
    })
    .filter((s) => s.storeId && s.name);

  storeCacheTime = Date.now();
  return storeCache;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o');
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ stores: [] });

  try {
    const stores = await getAllStores();
    const nq = normalize(q);
    const matches = stores
      .filter((s) => normalize(s.name).includes(nq) || normalize(s.town).includes(nq))
      .slice(0, 8);
    return NextResponse.json({ stores: matches });
  } catch {
    return NextResponse.json({ stores: [] });
  }
}
