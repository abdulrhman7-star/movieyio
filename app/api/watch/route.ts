import { NextResponse } from 'next/server';
import { getCleanLink } from '@/lib/akwam';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'الرابط مطلوب' }, { status: 400 });
  }

  try {
    const links = await getCleanLink(url);
    if (!links || links.length === 0) {
      return NextResponse.json({ success: false, error: 'لم يتم العثور على روابط' }, { status: 404 });
    }

    // نختار أعلى جودة متوفرة أو أول رابط
    // يمكنك تعديل المنطق لاختيار جودة معينة
    const bestLink = links[0].url;

    // إعادة التوجيه إلى مسار الـ stream مع الرابط النظيف
    const streamUrl = new URL(`/api/stream`, request.url);
    streamUrl.searchParams.set('url', bestLink);

    return NextResponse.redirect(streamUrl);

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
