import { NextResponse } from 'next/server';
import { getSeriesEpisodes, getMediaDetails } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || searchParams.get('link');
  const episodeNumber = searchParams.get('e') || searchParams.get('episode');

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: 'المعلمة url مطلوبة لجلب تفاصيل المسلسل وحلقاته من ak.sv',
        example: '/api/tv?url=https://ak.sv/series/...'
      },
      { status: 400 }
    );
  }

  try {
    const episodes = await getSeriesEpisodes(url);
    
    // If specific episode requested
    if (episodeNumber) {
      const epNum = parseInt(episodeNumber, 10);
      const targetEp = episodes[epNum - 1] || episodes.find(e => e.title.includes(episodeNumber));
      if (targetEp) {
        const details = await getMediaDetails(targetEp.url);
        return NextResponse.json({
          success: true,
          type: 'episode',
          series_url: url,
          episode_number: epNum,
          episode: targetEp,
          data: details
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        type: 'series',
        source: 'https://ak.sv',
        total_episodes: episodes.length,
        episodes: episodes
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
