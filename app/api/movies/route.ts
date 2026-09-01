import { NextResponse } from 'next/server';
import { getMovies } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const movies = await getMovies(page);
    return NextResponse.json(
      { success: true, data: movies },
      {
        headers: {
          'Cache-Control': 'public, max-age=180, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
