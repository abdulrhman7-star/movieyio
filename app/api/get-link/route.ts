import { NextResponse } from 'next/server';
import { getMediaDetails } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'الرابط مطلوب' }, { status: 400 });
  }

  try {
    const details = await getMediaDetails(url);
    return NextResponse.json(
      {
        success: true,
        data: details.links,
        details: details,
        subtitles: details.subtitles || []
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

