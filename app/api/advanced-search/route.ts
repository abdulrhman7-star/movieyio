import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const AKWAM_DOMAIN = 'ak.sv';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const searchQuery = `site:${AKWAM_DOMAIN} ${q}`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`[*] جاري البحث عن '${q}' في موقع أكوام عبر جوجل...`);
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };

    const googleResponse = await axios.get(googleUrl, { headers, timeout: 10000 });
    const $google = cheerio.load(googleResponse.data);
    
    let moviePageUrl: string | null = null;
    
    $google('a[href]').each((_, el) => {
      if (moviePageUrl) return; // already found
      
      const href = $google(el).attr('href');
      if (!href) return;

      let actualUrl = href;
      if (href.startsWith('/url?q=')) {
        actualUrl = href.split('/url?q=')[1].split('&')[0];
        actualUrl = decodeURIComponent(actualUrl);
      }

      if (actualUrl.includes(AKWAM_DOMAIN) && (actualUrl.includes('/movie/') || actualUrl.includes('/series/') || actualUrl.includes('/episode/'))) {
        moviePageUrl = actualUrl;
      }
    });

    if (!moviePageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'لم يتم العثور على صفحة للمحتوى في نتائج البحث الأولى.' 
      }, { status: 404 });
    }

    console.log(`[+] تم العثور على الصفحة: ${moviePageUrl}`);

    const movieResponse = await axios.get(moviePageUrl, { headers, timeout: 10000 });
    const $movie = cheerio.load(movieResponse.data);
    
    const serverLinks: string[] = [];
    
    $movie('a[href]').each((_, el) => {
      const href = $movie(el).attr('href');
      if (href && href.includes('downet.net')) {
        serverLinks.push(href);
      }
    });

    const uniqueLinks = Array.from(new Set(serverLinks));

    return NextResponse.json({
      success: true,
      data: {
        title: q,
        page_url: moviePageUrl,
        download_links: uniqueLinks.map(url => ({
          url,
          host: 'downet.net'
        }))
      }
    });

  } catch (error: any) {
    console.error('Advanced search error:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'حدث خطأ أثناء تشغيل الكود: ' + (error.message || 'Unknown error') 
    }, { status: 500 });
  }
}
