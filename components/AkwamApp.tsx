"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Play, 
  Download, 
  Film, 
  Tv, 
  ArrowRight, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Code2, 
  Share2,
  Sparkles,
  Zap,
  Shield,
  Star,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Flame,
  Home,
  Compass,
  X,
  SlidersHorizontal
} from 'lucide-react';
import PlayerSection, { VideoQuality, SubtitleTrack } from './PlayerSection';
import EpisodesSidebar from './EpisodesSidebar';
import EmbedModal from './EmbedModal';
import ApiDocsModal from './ApiDocsModal';
import type { MediaItem, MediaDetails } from '@/lib/akwam';

// High-speed client cache for instant responses
const clientDetailsCache = new Map<string, MediaDetails>();
const clientEpisodesCache = new Map<string, MediaItem[]>();
const clientSearchCache = new Map<string, MediaItem[]>();

export default function AkwamApp() {
  const [view, setView] = useState<'home' | 'search' | 'series' | 'watch'>('home');
  const [activeNavTab, setActiveNavTab] = useState<'all' | 'movies' | 'series'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Watch State
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [currentDetails, setCurrentDetails] = useState<MediaDetails | null>(null);
  const [episodes, setEpisodes] = useState<MediaItem[]>([]);
  const [currentEpisodeUrl, setCurrentEpisodeUrl] = useState<string>('');
  const [videoLinks, setVideoLinks] = useState<VideoQuality[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Embed & API Docs Modal State
  const [isEmbedOpen, setIsEmbedOpen] = useState<boolean>(false);
  const [embedVideoUrl, setEmbedVideoUrl] = useState<string>('');
  const [embedTitle, setEmbedTitle] = useState<string>('');
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [apiDocsInitialUrl, setApiDocsInitialUrl] = useState<string>('');
  const [apiDocsInitialQuery, setApiDocsInitialQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (view === 'home' && movies.length === 0 && series.length === 0) {
      Promise.all([
        fetch('/api/movies?page=1').then(res => res.json()),
        fetch('/api/series?page=1').then(res => res.json())
      ]).then(([moviesRes, seriesRes]) => {
        if (!isMounted) return;
        if (moviesRes.success) setMovies(moviesRes.data || []);
        if (seriesRes.success) setSeries(seriesRes.data || []);
        if (!moviesRes.success && !seriesRes.success) {
          setError(moviesRes.error || seriesRes.error || 'تعذر جلب البيانات من الخادم');
        }
      }).catch((e: any) => {
        if (isMounted) {
          console.error(e);
          setError('حدث خطأ أثناء الاتصال بموقع ak.sv');
        }
      }).finally(() => {
        if (isMounted) setLoading(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [view, movies.length, series.length]);

  // Fast prefetch on hover to accelerate clicks
  const prefetchMedia = (item: MediaItem) => {
    if (item.url.includes('/series/') || item.url.includes('series')) {
      if (!clientEpisodesCache.has(item.url)) {
        fetch(`/api/series-episodes?url=${encodeURIComponent(item.url)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.data)) {
              clientEpisodesCache.set(item.url, data.data);
            }
          })
          .catch(() => {});
      }
    } else {
      if (!clientDetailsCache.has(item.url)) {
        fetch(`/api/get-link?url=${encodeURIComponent(item.url)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.details) {
              clientDetailsCache.set(item.url, data.details);
            }
          })
          .catch(() => {});
      }
    }
  };

  // Search handler targeting https://ak.sv/search?q=
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ) return;
    
    // Check client cache for instant response
    if (clientSearchCache.has(cleanQ.toLowerCase())) {
      setResults(clientSearchCache.get(cleanQ.toLowerCase())!);
      setView('search');
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setView('search');
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQ)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
        clientSearchCache.set(cleanQ.toLowerCase(), data.data || []);
      } else {
        setError(data.error || 'لا توجد نتائج تطابق بحثك');
      }
    } catch (e) {
      setError('فشل البحث في موقع ak.sv');
    } finally {
      setLoading(false);
    }
  };

  // Item click handler
  const handleMediaClick = async (item: MediaItem) => {
    setCurrentMedia(item);
    setError('');
    
    if (item.url.includes('/series/') || item.url.includes('series')) {
      setView('series');
      // Instant display if cached
      if (clientEpisodesCache.has(item.url)) {
        setEpisodes(clientEpisodesCache.get(item.url)!);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/series-episodes?url=${encodeURIComponent(item.url)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setEpisodes(data.data);
          clientEpisodesCache.set(item.url, data.data);
        } else {
          setError(data.error || 'لم يتم العثور على حلقات لهذا المسلسل');
        }
      } catch (e) {
        setError('فشل في جلب حلقات المسلسل من ak.sv');
      } finally {
        setLoading(false);
      }
    } else {
      // Movie
      playMediaUrl(item.url, item);
    }
  };

  // Play specific media or episode URL
  const playMediaUrl = async (url: string, mediaItem?: MediaItem) => {
    setView('watch');
    setCurrentEpisodeUrl(url);
    setError('');

    // Instant load if details are cached
    if (clientDetailsCache.has(url)) {
      const cached = clientDetailsCache.get(url)!;
      setCurrentDetails(cached);
      setVideoLinks(cached.links);
      setSubtitles(cached.subtitles || []);
      return;
    }

    setLoading(true);
    setVideoLinks([]);
    setSubtitles([]);

    try {
      const res = await fetch(`/api/get-link?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success && data.details) {
        setCurrentDetails(data.details);
        setVideoLinks(data.details.links || []);
        setSubtitles(data.details.subtitles || []);
        clientDetailsCache.set(url, data.details);
      } else if (data.success && Array.isArray(data.data)) {
        setVideoLinks(data.data);
        setSubtitles(data.subtitles || []);
      } else {
        setError(data.error || 'تعذر جلب روابط المشاهدة من ak.sv');
      }
    } catch (e) {
      setError('حدث خطأ أثناء استخراج روابط الفيديو');
    } finally {
      setLoading(false);
    }
  };

  // Refresh current token / links from ak.sv
  const handleRefreshToken = async () => {
    if (!currentEpisodeUrl && !currentMedia?.url) return;
    const target = currentEpisodeUrl || currentMedia!.url;
    setIsRefreshing(true);
    clientDetailsCache.delete(target);

    try {
      const res = await fetch(`/api/get-link?url=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (data.success && data.details) {
        setCurrentDetails(data.details);
        setVideoLinks(data.details.links || []);
        setSubtitles(data.details.subtitles || []);
        clientDetailsCache.set(target, data.details);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Featured spotlight item for home banner
  const featuredItem = useMemo(() => {
    if (movies.length > 0) return movies[0];
    if (series.length > 0) return series[0];
    return null;
  }, [movies, series]);

  // Filtered home media list
  const displayedHomeMedia = useMemo(() => {
    let list: MediaItem[] = [];
    if (activeNavTab === 'all') {
      list = [...movies, ...series];
    } else if (activeNavTab === 'movies') {
      list = movies;
    } else {
      list = series;
    }

    if (activeCategoryFilter !== 'all') {
      list = list.filter(item => {
        if (activeCategoryFilter === '4k' || activeCategoryFilter === '1080p') {
          return item.quality?.toLowerCase().includes(activeCategoryFilter);
        }
        return item.category?.toLowerCase().includes(activeCategoryFilter) || item.title.toLowerCase().includes(activeCategoryFilter);
      });
    }

    return list;
  }, [movies, series, activeNavTab, activeCategoryFilter]);

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Professional Navigation Bar (Moviesio Pro) */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-gray-800/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Logo */}
          <div 
            onClick={() => setView('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-400 p-0.5 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  moviesio
                </span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-cyan-500 text-white tracking-widest">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium block">بوابة ak.sv المباشرة</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800/60">
            <button
              id="nav-tab-home"
              onClick={() => {
                setView('home');
                setActiveNavTab('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                view === 'home' && activeNavTab === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> الرئيسية
            </button>
            <button
              id="nav-tab-movies"
              onClick={() => {
                setView('home');
                setActiveNavTab('movies');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                view === 'home' && activeNavTab === 'movies'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> الأفلام
            </button>
            <button
              id="nav-tab-series"
              onClick={() => {
                setView('home');
                setActiveNavTab('series');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                view === 'home' && activeNavTab === 'series'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" /> المسلسلات
            </button>
            <button
              id="nav-tab-api"
              onClick={() => {
                setApiDocsInitialQuery(query || 'Inception');
                setApiDocsInitialUrl(currentEpisodeUrl || currentMedia?.url || 'https://ak.sv/movie/1234');
                setIsApiDocsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all ml-1"
            >
              <Code2 className="w-3.5 h-3.5" /> استخراج API
            </button>
          </nav>

          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <div className="relative group">
                <input
                  id="main-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث في ak.sv (https://ak.sv/search?q=)..."
                  className="w-full bg-gray-900/90 border border-gray-700/80 focus:border-blue-500 text-white text-xs sm:text-sm rounded-xl pr-10 pl-10 py-2.5 outline-none transition-all placeholder:text-gray-500 shadow-inner group-hover:border-gray-600"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 group-hover:text-blue-400 transition-colors" />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            <button
              id="btn-open-api-docs-mobile"
              onClick={() => {
                setApiDocsInitialQuery(query || 'Inception');
                setApiDocsInitialUrl(currentEpisodeUrl || currentMedia?.url || 'https://ak.sv/movie/1234');
                setIsApiDocsOpen(true);
              }}
              className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-slate-800 shrink-0"
              title="استخراج API"
            >
              <Code2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-xs text-red-400 hover:underline"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* VIEW: WATCH (16:9 Cinema Player & Episodes Sidebar) */}
        {view === 'watch' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Back Button and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                id="btn-back-from-watch"
                onClick={() => setView(episodes.length > 0 ? 'series' : 'home')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-bold border border-gray-800 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة إلى {episodes.length > 0 ? 'قائمة الحلقات' : 'الرئيسية'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-watch-inspect-api"
                  onClick={() => {
                    const target = currentEpisodeUrl || currentMedia?.url || '';
                    setApiDocsInitialUrl(target);
                    setIsApiDocsOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm"
                  title="استخراج بيانات JSON وروابط السيرفرات المباشرة"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>استخراج JSON / API</span>
                </button>

                <span className="text-xs font-semibold text-gray-400">
                  {currentDetails?.year ? `سنة الإصدار: ${currentDetails.year}` : ''}
                </span>
              </div>
            </div>

            {/* Cinema Player Section + Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Player Column */}
              <div className={`${episodes.length > 0 ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'}`}>
                <PlayerSection
                  title={currentDetails?.title || currentMedia?.title || 'مشاهدة الفيديو'}
                  poster={currentDetails?.image || currentMedia?.image}
                  qualities={videoLinks}
                  subtitles={subtitles}
                  initialMode="direct"
                  onEmbedClick={() => {
                    if (videoLinks.length > 0) {
                      setEmbedVideoUrl(videoLinks[0].url);
                      setEmbedTitle(currentDetails?.title || currentMedia?.title || 'فيديو');
                      setIsEmbedOpen(true);
                    }
                  }}
                  onRefreshLink={handleRefreshToken}
                  isRefreshing={isRefreshing}
                />

                {/* Media Details & Story Section */}
                <div className="mt-6 bg-[#0B0F19]/90 border border-gray-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Poster thumbnail */}
                    {(currentDetails?.image || currentMedia?.image) && (
                      <div className="w-28 md:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-gray-700/60 shrink-0 bg-gray-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentDetails?.image || currentMedia?.image}
                          alt={currentDetails?.title || currentMedia?.title || ''}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Metadata Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl md:text-2xl font-black text-white">
                          {currentDetails?.title || currentMedia?.title}
                        </h1>
                        {currentDetails?.quality && (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold font-mono">
                            {currentDetails.quality}
                          </span>
                        )}
                        {currentDetails?.rating && (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {currentDetails.rating}
                          </span>
                        )}
                      </div>

                      {/* Genre Tags & Meta chips */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {currentDetails?.year && (
                          <span className="flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {currentDetails.year}
                          </span>
                        )}
                        {currentDetails?.duration && (
                          <span className="flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {currentDetails.duration}
                          </span>
                        )}
                        {currentDetails?.genres?.map((g) => (
                          <span key={g} className="bg-gray-800/80 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700/50">
                            {g}
                          </span>
                        ))}
                      </div>

                      {/* Story / Synopsis */}
                      {currentDetails?.story && (
                        <div className="pt-2 border-t border-gray-800/80">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">قصة العمل</h4>
                          <p className="text-sm text-gray-300 leading-relaxed font-normal">
                            {currentDetails.story}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Episodes Sidebar Column (If watching a series) */}
              {episodes.length > 0 && (
                <div className="lg:col-span-4 xl:col-span-3">
                  <EpisodesSidebar
                    episodes={episodes}
                    currentEpisodeUrl={currentEpisodeUrl}
                    seriesTitle={currentMedia?.title || 'حلقات المسلسل'}
                    onSelectEpisode={(ep) => playMediaUrl(ep.url, ep)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: SERIES (Episodes selection with search & filter) */}
        {view === 'series' && currentMedia && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header / Banner */}
            <div className="bg-[#0B0F19]/90 border border-gray-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col md:flex-row gap-6 items-center md:items-start">
              <button
                onClick={() => setView('home')}
                className="self-start md:hidden flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white mb-2"
              >
                <ArrowRight className="w-4 h-4" /> العودة
              </button>

              {currentMedia.image && (
                <div className="w-36 md:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-gray-700/60 shrink-0 bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentMedia.image}
                    alt={currentMedia.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="flex-1 space-y-3 text-center md:text-right">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-white">{currentMedia.title}</h1>
                  {currentMedia.quality && (
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold font-mono">
                      {currentMedia.quality}
                    </span>
                  )}
                  {currentMedia.rating && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {currentMedia.rating}
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-gray-300 max-w-2xl leading-relaxed">
                  {currentMedia.story || 'اختر حلقة من القائمة أدناه لتشغيلها مباشرة في المشغل السينمائي بجودة عالية وبدون تقطيع.'}
                </p>

                {episodes.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button
                      id="btn-play-ep1"
                      onClick={() => playMediaUrl(episodes[0].url, episodes[0])}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      تشغيل الحلقة الأولى
                    </button>
                    <span className="text-xs text-gray-400 font-semibold">
                      إجمالي {episodes.length} حلقة متوفرة
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Episodes Sidebar / Grid with Text Filter */}
            <div className="max-w-4xl mx-auto">
              <EpisodesSidebar
                episodes={episodes}
                currentEpisodeUrl={currentEpisodeUrl}
                seriesTitle={currentMedia.title}
                onSelectEpisode={(ep) => playMediaUrl(ep.url, ep)}
              />
            </div>
          </div>
        )}

        {/* VIEW: SEARCH RESULTS */}
        {view === 'search' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('home')}
                  className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-lg font-black text-white">نتائج البحث في ak.sv</h2>
                  <span className="text-xs text-gray-400">
                    تم العثور على {results.length} نتيجة مطابقة لـ &quot;{query}&quot;
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setApiDocsInitialQuery(query);
                  setIsApiDocsOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>استخراج API للبحث (JSON)</span>
              </button>
            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="mt-4 text-xs font-semibold text-gray-400">جاري جلب النتائج من ak.sv...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <Film className="w-12 h-12 text-gray-600 mx-auto" />
                <h3 className="text-base font-bold text-gray-300">لا توجد نتائج تطابق بحثك</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  تأكد من كتابة الاسم باللغة العربية أو الإنجليزية بشكل صحيح وحاول مجدداً.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {results.map((item, idx) => (
                  <MediaCard
                    key={`search-res-${item.url}-${idx}`}
                    item={item}
                    onClick={() => handleMediaClick(item)}
                    onMouseEnter={() => prefetchMedia(item)}
                    onInspectApi={(e) => {
                      e.stopPropagation();
                      setApiDocsInitialUrl(item.url);
                      setIsApiDocsOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: HOME DASHBOARD (Moviesio Pro Style) */}
        {view === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Spotlight Featured Hero Banner */}
            {featuredItem && (
              <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/90 to-transparent border border-gray-800/80 shadow-2xl p-6 sm:p-10 flex flex-col justify-end min-h-[320px] sm:min-h-[400px]">
                {/* Backdrop image */}
                {featuredItem.image && (
                  <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredItem.image}
                      alt={featuredItem.title}
                      className="w-full h-full object-cover object-top opacity-25 filter blur-[1px] scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/80 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/80 to-transparent"></div>
                  </div>
                )}

                {/* Banner Content */}
                <div className="relative z-10 max-w-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-lg shadow-blue-600/40">
                      <Flame className="w-3 h-3 fill-white" /> الأبرز حالياً
                    </span>
                    {featuredItem.quality && (
                      <span className="px-2.5 py-1 rounded-full bg-gray-800/90 text-cyan-400 border border-gray-700 text-[11px] font-bold font-mono">
                        {featuredItem.quality}
                      </span>
                    )}
                    {featuredItem.rating && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {featuredItem.rating}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    {featuredItem.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed max-w-xl">
                    {featuredItem.story || 'استمتع بمشاهدة أحدث الأفلام والمسلسلات بجودة فائقة وبث مباشر وسريع من موقع ak.sv.'}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      id="btn-hero-watch"
                      onClick={() => handleMediaClick(featuredItem)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-bold shadow-xl shadow-blue-600/30 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      مشاهدة الآن
                    </button>

                    <button
                      onClick={() => {
                        setApiDocsInitialUrl(featuredItem.url);
                        setIsApiDocsOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-bold transition-all"
                    >
                      <Code2 className="w-4 h-4" />
                      استخراج API
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Pills Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-800/80">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: '1080p', label: 'جودة 1080p' },
                  { id: '4k', label: 'جودة 4K' },
                  { id: 'أكشن', label: 'أكشن' },
                  { id: 'دراما', label: 'دراما' },
                  { id: 'كوميديا', label: 'كوميديا' },
                  { id: 'رعب', label: 'رعب' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveCategoryFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      activeCategoryFilter === f.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-gray-400 font-semibold">
                عرض {displayedHomeMedia.length} عمل
              </span>
            </div>

            {/* Content Media Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="mt-4 text-xs font-semibold text-gray-400">جاري جلب أحدث الإضافات من ak.sv...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {displayedHomeMedia.map((item, idx) => (
                  <MediaCard
                    key={`home-media-${item.url}-${idx}`}
                    item={item}
                    onClick={() => handleMediaClick(item)}
                    onMouseEnter={() => prefetchMedia(item)}
                    onInspectApi={(e) => {
                      e.stopPropagation();
                      setApiDocsInitialUrl(item.url);
                      setIsApiDocsOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Embed Code Generation Modal */}
      <EmbedModal
        isOpen={isEmbedOpen}
        onClose={() => setIsEmbedOpen(false)}
        defaultVideoUrl={embedVideoUrl}
        defaultTitle={embedTitle}
      />

      {/* API Docs & 2Embed Explorer Modal */}
      <ApiDocsModal
        isOpen={isApiDocsOpen}
        onClose={() => setIsApiDocsOpen(false)}
        initialUrl={apiDocsInitialUrl}
        initialQuery={apiDocsInitialQuery}
      />
    </div>
  );
}

// Sub-component for individual media cards (Moviesio Pro styling)
function MediaCard({
  item,
  onClick,
  onMouseEnter,
  onInspectApi
}: {
  item: MediaItem;
  onClick: () => void;
  onMouseEnter: () => void;
  onInspectApi?: (e: React.MouseEvent) => void;
}) {
  const isSeries = item.url.includes('/series/') || item.url.includes('series');

  return (
    <div
      id={`media-card-${encodeURIComponent(item.url)}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="group relative bg-[#0B0F19]/80 hover:bg-[#0F172A] border border-gray-800/80 hover:border-blue-500/80 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full bg-gray-900 overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
            <Film className="w-12 h-12 opacity-40" />
          </div>
        )}

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/40 opacity-70 group-hover:opacity-90 transition-opacity"></div>

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 z-10">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-md ${
              isSeries ? 'bg-purple-600' : 'bg-blue-600'
            }`}
          >
            {isSeries ? 'مسلسل' : 'فيلم'}
          </span>

          <div className="flex items-center gap-1">
            {onInspectApi && (
              <button
                type="button"
                onClick={onInspectApi}
                className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-0.5"
                title="استخراج JSON API لهذا العنصر"
              >
                <Code2 className="w-2.5 h-2.5" />
                <span>API</span>
              </button>
            )}
            {item.quality && (
              <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-cyan-300 border border-cyan-400/30 text-[10px] font-bold font-mono">
                {item.quality}
              </span>
            )}
          </div>
        </div>

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Rating Badge at bottom-left */}
        {item.rating && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-amber-300 border border-amber-400/30 text-[10px] font-bold">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{item.rating}</span>
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          {item.title}
        </h3>

        {item.year && (
          <span className="text-[11px] text-gray-500 font-mono">
            {item.year}
          </span>
        )}
      </div>
    </div>
  );
}
