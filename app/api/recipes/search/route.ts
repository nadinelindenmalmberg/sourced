import { NextRequest, NextResponse } from 'next/server';

/**
 * Search for recipes on Swedish recipe sites
 * This endpoint can be used to find real recipes from Swedish sites
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Encode the query for Google search with site filters
    const encodedQuery = encodeURIComponent(query);
    const googleSearchUrl = `https://www.google.com/search?q=${encodedQuery}+site:ica.se+OR+site:arla.se+OR+site:koket.se+OR+site:hemkop.se`;
    
    // Return the search URL and some metadata
    return NextResponse.json({
      searchUrl: googleSearchUrl,
      query: query,
      sites: ['ica.se', 'arla.se', 'koket.se', 'hemkop.se'],
      message: 'Use the searchUrl to find recipes on Swedish recipe sites',
    });
  } catch (error) {
    console.error('Error in recipe search:', error);
    return NextResponse.json(
      { error: 'Failed to generate search URL' },
      { status: 500 }
    );
  }
}
