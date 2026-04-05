import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface StoreInfo {
  storeId: string;
  name: string;
  address: string;
  town: string;
}

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });

  try {
    const res = await fetch(`https://www.hemkop.se/axfood/rest/store/${storeId}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const data = await res.json();
    return NextResponse.json({
      storeId: data.storeId ?? storeId,
      name: data.name ?? '',
      address: data.address?.formattedAddress ?? '',
      town: data.address?.town ?? '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}
