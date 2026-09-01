import { NextResponse } from 'next/server';
import { getMediaDetails } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || searchParams.get('link') || searchParams.get('slug');

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: 'المعلمة url مطلوبة لجلب تفاصيل الفيلم من ak.sv',
        example: '/api/movie?url=https://ak.sv/movie/...'
      },
      { status: 400 }
    );
  }

  try {
    const details = await getMediaDetails(url);
    return NextResponse.json(
      {
        success: true,
        type: 'movie',
        source: 'https://ak.sv',
        data: details
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
