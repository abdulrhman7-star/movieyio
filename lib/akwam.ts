import * as cheerio from 'cheerio';
import dns from 'node:dns';
import { Agent } from 'undici';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Primary domains with automatic fallback
const PRIMARY_DOMAINS = [
  'https://ak.sv',
  'https://akwam.ss',
  'https://akwam.to',
  'https://akwam.site'
];
export const BASE_URL = 'https://ak.sv';

// Modern rotating User-Agents to prevent sandbox/blocking
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRealisticHeaders(targetUrl: string): Record<string, string> {
  let domain = 'ak.sv';
  try {
    const parsed = new URL(targetUrl);
    domain = parsed.hostname;
  } catch {}

  return {
    'User-Agent': getRandomUserAgent(),
    'Referer': `https://${domain}/`,
    'Origin': `https://${domain}`,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };
}

const akwamAgent = new Agent({
  connect: {
    rejectUnauthorized: false
  },
  connections: 40,
  pipelining: 2,
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 120000
});

// High-speed in-memory caches
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const pageCache = new Map<string, CacheEntry<string>>();
const linksCache = new Map<string, CacheEntry<MediaDetails>>();
const moviesCache = new Map<number, CacheEntry<MediaItem[]>>();
const seriesCache = new Map<number, CacheEntry<MediaItem[]>>();
const searchCache = new Map<string, CacheEntry<MediaItem[]>>();
const episodesCache = new Map<string, CacheEntry<MediaItem[]>>();

function getFromCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(cache: Map<string | number, CacheEntry<T>>, key: string | number, data: T, ttlMs: number) {
  if (cache.size > 500) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export interface MediaItem {
  title: string;
  url: string;
  image: string;
  rating?: string;
  quality?: string;
  year?: string;
  category?: string;
  story?: string;
}

export interface VideoLink {
  quality: string;
  url: string;
  isM3u8?: boolean;
}

export interface SubtitleTrack {
  label: string;
  lang: string;
  src: string;
}

export interface MediaDetails {
  title: string;
  image: string;
  story?: string;
  rating?: string;
  quality?: string;
  year?: string;
  duration?: string;
  genres?: string[];
  links: VideoLink[];
  subtitles?: SubtitleTrack[];
}

/**
 * Normalizes URL across ak.sv, akwam.ss, akwam.to to ensure consistent fetching
 */
function normalizeUrl(url: string, preferredDomain: string = BASE_URL): string {
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('/')) {
    cleanUrl = `${preferredDomain}${cleanUrl}`;
  } else {
    // Replace obsolete akwam domains with active base
    cleanUrl = cleanUrl.replace(/^https?:\/\/(www\.)?(akwam\.(ss|to|site|net)|ak\.sv)/i, preferredDomain);
  }

  try {
    return encodeURI(decodeURI(cleanUrl));
  } catch {
    return encodeURI(cleanUrl);
  }
}

async function fetchPage(url: string, timeoutMs = 20000): Promise<string> {
  const targetUrl = normalizeUrl(url);

  // Check cache (10 min TTL)
  const cached = getFromCache(pageCache, targetUrl);
  if (cached) return cached;

  // Try primary URL, with fallback across alternate domains if blocked
  const domainsToTry = [BASE_URL, 'https://akwam.ss', 'https://akwam.to'];
  let lastError: any = null;

  for (const domain of domainsToTry) {
    const candidateUrl = normalizeUrl(url, domain);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(candidateUrl, {
        signal: controller.signal,
        dispatcher: akwamAgent,
        headers: getRealisticHeaders(candidateUrl),
        redirect: 'follow',
        cache: 'no-store'
      } as any);

      clearTimeout(timeout);

      if (response.ok) {
        const text = await response.text();
        // If response is valid HTML and not a block screen
        if (text && (text.includes('<html') || text.includes('entry-title') || text.includes('widget'))) {
          setInCache(pageCache, targetUrl, text, 10 * 60 * 1000);
          return text;
        }
      }
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;
    }
  }

  console.error(`Error fetching page ${url} (${targetUrl}):`, lastError?.message || lastError);
  throw new Error(`فشل في جلب الصفحة من المصدر: ${lastError?.message || 'تعذر الاتصال'}`);
}

function extractItemsFromHtml(html: string): MediaItem[] {
  const $ = cheerio.load(html, { xml: false });
  const items: MediaItem[] = [];
  const seenUrls = new Set<string>();

  // Select all possible card containers in Akwam & ak.sv layouts
  $('div.col-lg-auto, div.entry-box, div.col-6, div.widget-body .row > div, div.col-md-4, div.col-sm-6, .movie-item, .series-item, .entry-card').each((_, el) => {
    const $el = $(el);
    
    // Find title and link
    const $link = $el.find('h3.entry-title a, .entry-title a, a.entry-title, a[href*="/movie/"], a[href*="/series/"], a[href*="/show/"]').first();
    let title = $link.text().trim() || $el.find('h3.entry-title, .entry-title, h3, h2').first().text().trim();
    let url = $link.attr('href') || $el.find('a').first().attr('href') || '';
    
    if (!url || !title || url.startsWith('#') || url.startsWith('javascript')) return;

    if (url.startsWith('/')) {
      url = `${BASE_URL}${url}`;
    }

    if (seenUrls.has(url)) return;

    // Image with high quality fallback
    const $img = $el.find('img').first();
    const image = $img.attr('data-src') || $img.attr('src') || $img.attr('data-original') || '';

    // Rating, Quality, Year, Story
    const rating = $el.find('.rating, [class*="rating"], .imdb, .rate').first().text().replace(/[^0-9.]/g, '').trim();
    const quality = $el.find('.quality, [class*="quality"], .badge, .label-quality').first().text().replace(/\s+/g, ' ').trim();
    const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : $el.find('.year, [class*="year"]').first().text().trim();
    const category = $el.find('.category, [class*="cat"], .genre').first().text().trim();
    const story = $el.find('.story, .entry-story, p').first().text().trim();

    seenUrls.add(url);
    items.push({
      title,
      url,
      image,
      rating: rating || undefined,
      quality: quality || undefined,
      year: year || undefined,
      category: category || undefined,
      story: story ? (story.length > 120 ? `${story.substring(0, 120)}...` : story) : undefined
    });
  });

  return items;
}

export async function getMovies(page: number = 1): Promise<MediaItem[]> {
  const cached = getFromCache(moviesCache, page);
  if (cached && cached.length > 0) return cached;

  const html = await fetchPage(`${BASE_URL}/movies?page=${page}`);
  const items = extractItemsFromHtml(html);
  if (items.length > 0) {
    setInCache(moviesCache, page, items, 15 * 60 * 1000);
  }
  return items;
}

export async function getSeries(page: number = 1): Promise<MediaItem[]> {
  const cached = getFromCache(seriesCache, page);
  if (cached && cached.length > 0) return cached;

  const html = await fetchPage(`${BASE_URL}/series?page=${page}`);
  const items = extractItemsFromHtml(html);
  if (items.length > 0) {
    setInCache(seriesCache, page, items, 15 * 60 * 1000);
  }
  return items;
}

export async function search(keyword: string): Promise<MediaItem[]> {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) return [];

  const cacheKey = cleanKeyword.toLowerCase();
  const cached = getFromCache(searchCache, cacheKey);
  if (cached && cached.length > 0) return cached;

  const html = await fetchPage(`${BASE_URL}/search?q=${encodeURIComponent(cleanKeyword)}`);
  const items = extractItemsFromHtml(html);
  if (items.length > 0) {
    setInCache(searchCache, cacheKey, items, 10 * 60 * 1000);
  }
  return items;
}

export async function getSeriesEpisodes(seriesUrl: string): Promise<MediaItem[]> {
  const cached = getFromCache(episodesCache, seriesUrl);
  if (cached && cached.length > 0) return cached;

  const html = await fetchPage(seriesUrl);
  const $ = cheerio.load(html, { xml: false });
  const episodes: MediaItem[] = [];
  const seenUrls = new Set<string>();

  $('a[href*="/episode/"]').each((_, el) => {
    let url = $(el).attr('href') || '';
    if (!url) return;

    if (url.startsWith('/')) {
      url = `${BASE_URL}${url}`;
    }

    if (seenUrls.has(url)) return;

    let title = $(el).text().replace(/\s+/g, ' ').trim();
    if (!title) {
      title = $(el).parent().text().replace(/\s+/g, ' ').trim();
    }

    const $parent = $(el).closest('.col-lg-auto, .entry-box, div, li, tr');
    const $img = $parent.find('img').first();
    const image = $img.attr('data-src') || $img.attr('src') || '';
    const quality = $parent.find('.badge, .quality').first().text().trim();

    if (title && url) {
      seenUrls.add(url);
      episodes.push({
        title,
        url,
        image,
        quality: quality || undefined
      });
    }
  });

  if (episodes.length > 0) {
    setInCache(episodesCache, seriesUrl, episodes, 15 * 60 * 1000);
  }
  return episodes;
}

function isVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.includes('img.downet.net') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.ico')
  ) {
    return false;
  }
  return (
    lower.includes('.mp4') ||
    lower.includes('.mkv') ||
    lower.includes('.webm') ||
    lower.includes('.m3u8') ||
    lower.includes('downet.net/download/') ||
    lower.includes('/stream/') ||
    lower.includes('video')
  );
}

function parseQualityRank(q: string): number {
  const match = q.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  if (q.toLowerCase().includes('4k') || q.toLowerCase().includes('2160')) return 2160;
  if (q.toLowerCase().includes('1080')) return 1080;
  if (q.toLowerCase().includes('720')) return 720;
  if (q.toLowerCase().includes('480')) return 480;
  if (q.toLowerCase().includes('360')) return 360;
  return 0;
}

function cleanQualityLabel(qualityLabel: string, fallbackUrl: string): string {
  let formatted = qualityLabel.replace(/\s+/g, ' ').trim();
  
  const numMatch = formatted.match(/(1080|720|480|360|2160|4k)/i);
  if (numMatch) {
    const val = numMatch[1].toLowerCase();
    return val === '4k' ? '4K' : `${val}p`;
  }

  const urlMatch = fallbackUrl.match(/(1080|720|480|360|2160)/i);
  if (urlMatch) {
    return `${urlMatch[1]}p`;
  }

  if (formatted.includes('تحميل') || formatted.includes('مشاهدة') || !formatted) {
    return '1080p';
  }

  return formatted;
}

/**
 * Extracts complete media metadata, direct video links (.mp4, .m3u8), and subtitle tracks
 */
export async function getCleanLink(pageUrl: string): Promise<VideoLink[]> {
  const details = await getMediaDetails(pageUrl);
  return details.links;
}

export async function getMediaDetails(pageUrl: string): Promise<MediaDetails> {
  const targetUrl = normalizeUrl(pageUrl);

  const cached = getFromCache(linksCache, targetUrl);
  if (cached && cached.links.length > 0) {
    return cached;
  }

  try {
    const html = await fetchPage(targetUrl, 20000);
    const $ = cheerio.load(html, { xml: false });
    
    // 1. Extract Details
    const title = $('h1.entry-title, .entry-title, h1').first().text().trim() || 'فيديو بدون عنوان';
    const image = $('div.col-lg-auto img, .entry-image img, .poster img, img').first().attr('data-src') || 
                  $('div.col-lg-auto img, .entry-image img, .poster img, img').first().attr('src') || '';
    const story = $('.entry-story, .story, .widget-body p, p.text-muted, p').first().text().replace(/\s+/g, ' ').trim();
    const rating = $('.rating, .imdb, .rate, [class*="rating"]').first().text().replace(/[^0-9.]/g, '').trim();
    const quality = $('.badge, .quality, [class*="quality"]').first().text().trim();
    const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : $('.year, [class*="year"]').first().text().trim();
    const duration = $('[class*="duration"], .time, span:contains("دقيقة")').first().text().trim();
    
    const genres: string[] = [];
    $('a[href*="/genre/"], a[href*="/category/"], .genre, .tag').each((_, el) => {
      const g = $(el).text().trim();
      if (g && !genres.includes(g)) genres.push(g);
    });

    const directUrls: VideoLink[] = [];
    const seenLinks = new Set<string>();
    const subtitles: SubtitleTrack[] = [];
    const seenSubs = new Set<string>();

    const addLink = (rawUrl: string, qualityLabel: string) => {
      if (!rawUrl || !isVideoUrl(rawUrl)) return;

      let clean = rawUrl
        .replace(/^(https:\/\/ak\.svvlc:\/\/|https:\/\/akwam\.ssvlc:\/\/|intent:\/\/|intent:|vlc:\/\/)/i, '')
        .trim();

      if (clean.includes('#Intent;')) {
        clean = clean.split('#Intent;')[0];
      }

      if (clean && clean.startsWith('http') && !seenLinks.has(clean)) {
        seenLinks.add(clean);
        const formattedQuality = cleanQualityLabel(qualityLabel, clean);
        const isM3u8 = clean.toLowerCase().includes('.m3u8');

        directUrls.push({
          quality: formattedQuality,
          url: clean,
          isM3u8
        });
      }
    };

    // Subtitle extraction
    $('track[kind="subtitles"], track[kind="captions"], a[href*=".vtt"], a[href*=".srt"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href');
      const label = $(el).attr('label') || $(el).text().trim() || 'العربية';
      const srclang = $(el).attr('srclang') || 'ar';
      if (src && !seenSubs.has(src)) {
        seenSubs.add(src);
        subtitles.push({
          label,
          lang: srclang,
          src
        });
      }
    });

    // 1. Direct <video><source src="..."> elements
    $('video source, source').each((_, el) => {
      const src = $(el).attr('src');
      const size = $(el).attr('size') || $(el).attr('data-quality') || $(el).attr('title') || '';
      if (src) {
        addLink(src, size ? `${size}p` : '1080p');
      }
    });

    // 2. Direct video links on the current page
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (isVideoUrl(href)) {
        addLink(href, text || '1080p');
      }
    });

    // 3. If no direct video streams found immediately, probe watch & download sub-pages concurrently
    if (directUrls.length === 0) {
      const seenProbeUrls = new Set<string>();
      const watchTargets: { url: string; label: string }[] = [];
      const downloadTargets: { url: string; label: string }[] = [];

      $('a[href*="/watch/"]').each((_, el) => {
        let href = $(el).attr('href') || '';
        if (!href) return;
        if (href.startsWith('/')) {
          href = `${BASE_URL}${href}`;
        }
        if (seenProbeUrls.has(href)) return;
        seenProbeUrls.add(href);

        const text = $(el).text().replace(/\s+/g, ' ').trim();
        const parentCard = $(el).closest('.download-item, .col-lg-auto, tr, li, div');
        const qualityText = parentCard.find('.badge, .quality, span.badge, [class*="quality"]').text().replace(/\s+/g, ' ').trim();
        
        watchTargets.push({
          url: href,
          label: qualityText || text || '1080p'
        });
      });

      $('a[href*="/download/"]').each((_, el) => {
        let href = $(el).attr('href') || '';
        if (!href) return;
        if (href.startsWith('/')) {
          href = `${BASE_URL}${href}`;
        }
        if (seenProbeUrls.has(href)) return;
        seenProbeUrls.add(href);

        const text = $(el).text().replace(/\s+/g, ' ').trim();
        const parentCard = $(el).closest('.download-item, .col-lg-auto, tr, li, div');
        const qualityText = parentCard.find('.badge, .quality, span.badge, [class*="quality"]').text().replace(/\s+/g, ' ').trim();
        
        downloadTargets.push({
          url: href,
          label: qualityText || text || '1080p'
        });
      });

      const probeTargets = [...watchTargets, ...downloadTargets].slice(0, 6);

      if (probeTargets.length > 0) {
        const settledResults = await Promise.allSettled(
          probeTargets.map(t => fetchPage(t.url, 15000))
        );

        settledResults.forEach((res, index) => {
          if (res.status === 'fulfilled') {
            const $sub = cheerio.load(res.value, { xml: false });
            const targetMeta = probeTargets[index];

            $sub('video source, source').each((_, el) => {
              const src = $sub(el).attr('src');
              const size = $sub(el).attr('size') || $sub(el).attr('data-quality') || targetMeta.label;
              if (src && isVideoUrl(src)) {
                addLink(src, size);
              }
            });

            $sub('a').each((_, el) => {
              const href = $sub(el).attr('href') || '';
              const text = $sub(el).text().replace(/\s+/g, ' ').trim();
              if (isVideoUrl(href)) {
                addLink(href, targetMeta.label || text);
              }
            });
          }
        });
      }
    }

    directUrls.sort((a, b) => parseQualityRank(b.quality) - parseQualityRank(a.quality));

    const finalLinks: VideoLink[] = [];
    const qualityCount = new Map<string, number>();

    for (const link of directUrls) {
      const baseQ = link.quality;
      const count = (qualityCount.get(baseQ) || 0) + 1;
      qualityCount.set(baseQ, count);

      if (count === 1) {
        finalLinks.push(link);
      } else if (count === 2) {
        finalLinks.push({
          quality: `${baseQ} (سيرفر ${count})`,
          url: link.url,
          isM3u8: link.isM3u8
        });
      }
    }

    const result: MediaDetails = {
      title,
      image,
      story: story || undefined,
      rating: rating || undefined,
      quality: quality || undefined,
      year: year || undefined,
      duration: duration || undefined,
      genres: genres.length > 0 ? genres : undefined,
      links: finalLinks,
      subtitles: subtitles.length > 0 ? subtitles : undefined
    };

    if (finalLinks.length > 0) {
      setInCache(linksCache, targetUrl, result, 5 * 60 * 1000);
      return result;
    }

    throw new Error('لم يتم العثور على روابط تشغيل مباشرة لهذا المحتوى حالياً');
  } catch (error: any) {
    console.error(`Error getting details for ${pageUrl}:`, error?.message || error);
    throw new Error(error?.message || 'فشل في استخراج البيانات من الصفحة');
  }
}




