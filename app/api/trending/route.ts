import { NextResponse } from 'next/server';
import { getMovies, getSeries } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const type = searchParams.get('type') || 'all'; // 'all', 'movie', 'tv'

  try {
    if (type === 'movie') {
      const movies = await getMovies(page);
      return NextResponse.json({ success: true, type: 'movies', page, data: movies });
    }

    if (type === 'tv' || type === 'series') {
      const series = await getSeries(page);
      return NextResponse.json({ success: true, type: 'series', page, data: series });
    }

    // Combined trending
    const [movies, series] = await Promise.all([
      getMovies(page),
      getSeries(page)
    ]);

    return NextResponse.json(
      {
        success: true,
        type: 'trending',
        page,
        total_items: movies.length + series.length,
        movies,
        series,
        data: [...movies, ...series]
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=180, s-maxage=360, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
