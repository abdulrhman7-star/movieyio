import { NextResponse } from 'next/server';
import { getMediaDetails } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || searchParams.get('link') || searchParams.get('id');

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: 'المعلمة url مطلوبة لجلب تفاصيل العمل من ak.sv (مثال: ?url=https://ak.sv/movie/1234/title)',
        example: '/api/details?url=https://ak.sv/movie/...'
      },
      { status: 400 }
    );
  }

  try {
    const details = await getMediaDetails(url);
    return NextResponse.json(
      {
        success: true,
        source: 'https://ak.sv',
        data: details,
        direct_stream_links: details.links,
        subtitles: details.subtitles || []
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=180, s-maxage=360, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'تعذر استخراج بيانات المحتوى من ak.sv'
      },
      { status: 500 }
    );
  }
}
