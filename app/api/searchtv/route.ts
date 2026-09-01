import { NextResponse } from 'next/server';
import { search } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ success: false, error: 'كلمة البحث مطلوبة' }, { status: 400 });
  }

  try {
    const results = await search(q);
    // Filter for series if possible or return all
    const seriesResults = results.filter(
      r => r.url.includes('/series/') || r.url.includes('series') || (r.category && r.category.includes('مسلسل'))
    );

    return NextResponse.json(
      {
        success: true,
        type: 'tv_shows',
        query: q,
        total: (seriesResults.length > 0 ? seriesResults : results).length,
        data: seriesResults.length > 0 ? seriesResults : results
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
