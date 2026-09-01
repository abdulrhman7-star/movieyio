"use client";

import React, { useState } from 'react';
import { 
  Code2, 
  X, 
  Copy, 
  Check, 
  Play, 
  ExternalLink, 
  Send, 
  Search, 
  FileText, 
  Film, 
  Tv, 
  Zap, 
  Terminal, 
  Braces, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialUrl?: string;
}

interface EndpointDoc {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  category: 'Search' | 'Details' | 'Streaming' | 'Embed';
  params: { name: string; type: string; required: boolean; description: string; example: string }[];
  exampleResponse: any;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/search',
    description: 'البحث الشامل في موقع ak.sv واستخراج نتائج الأفلام والمسلسلات مع البوسترات والتقييمات.',
    category: 'Search',
    params: [
      { name: 'q', type: 'string', required: true, description: 'الكلمة المفتاحية للبحث (اسم الفيلم أو المسلسل)', example: 'Batman' }
    ],
    exampleResponse: {
      success: true,
      data: [
        {
          title: "The Batman (2022)",
          url: "https://ak.sv/movie/1234/the-batman",
          image: "https://ak.sv/uploads/posters/the-batman.jpg",
          rating: "7.8",
          quality: "1080p BluRay",
          year: "2022",
          category: "أفلام أجنبية",
          story: "عندما يبدأ قاتل متسلسل سادي في استهداف الشخصيات السياسية البارزة في جوثام..."
        }
      ]
    }
  },
  {
    method: 'GET',
    path: '/api/details',
    description: 'استخراج كافة البيانات الوصفية والقصة وروابط البث المباشرة والترجمة لصفحة العمل من ak.sv.',
    category: 'Details',
    params: [
      { name: 'url', type: 'string', required: true, description: 'رابط الصفحة في ak.sv (فيلم أو حلقة)', example: 'https://ak.sv/movie/1234/the-batman' }
    ],
    exampleResponse: {
      success: true,
      source: "https://ak.sv",
      data: {
        title: "The Batman (2022)",
        image: "https://ak.sv/uploads/posters/the-batman.jpg",
        story: "باتمان يتعاون مع المفوض جيم جوردون لتعقب القاتل ريدلر...",
        rating: "7.8",
        quality: "1080p",
        year: "2022",
        duration: "176 دقيقة",
        genres: ["أكشن", "جريمة", "دراما"],
        links: [
          { quality: "1080p", url: "https://downet.net/download/stream1080.mp4", isM3u8: false },
          { quality: "720p", url: "https://downet.net/download/stream720.mp4", isM3u8: false }
        ],
        subtitles: [
          { label: "العربية", lang: "ar", src: "https://ak.sv/subtitles/the-batman-ar.vtt" }
        ]
      }
    }
  },
  {
    method: 'GET',
    path: '/api/movie',
    description: 'نقطة نهاية متوافقة مع معيار 2Embed لجلب بيانات الفيلم وروابط الجودات المباشرة.',
    category: 'Details',
    params: [
      { name: 'url', type: 'string', required: true, description: 'رابط الفيلم من ak.sv', example: 'https://ak.sv/movie/5678/oppenheimer' }
    ],
    exampleResponse: {
      success: true,
      type: "movie",
      data: {
        title: "Oppenheimer (2023)",
        rating: "8.9",
        quality: "4K UHD / 1080p",
        links: [
          { quality: "4K", url: "https://...", isM3u8: false },
          { quality: "1080p", url: "https://...", isM3u8: false }
        ]
      }
    }
  },
  {
    method: 'GET',
    path: '/api/tv',
    description: 'جلب حلقات المسلسل مع إمكانية تحديد رقم الحلقة مباشرة لاستخراج روابط تشغيلها.',
    category: 'Details',
    params: [
      { name: 'url', type: 'string', required: true, description: 'رابط المسلسل من ak.sv', example: 'https://ak.sv/series/1020/breaking-bad' },
      { name: 'e', type: 'number', required: false, description: 'رقم الحلقة المطلوب جلب روابطها مباشرة', example: '1' }
    ],
    exampleResponse: {
      success: true,
      type: "series",
      total_episodes: 62,
      episodes: [
        {
          title: "المسلسل - الحلقة 1",
          url: "https://ak.sv/episode/1021/breaking-bad-s1-e1",
          quality: "1080p"
        }
      ]
    }
  },
  {
    method: 'GET',
    path: '/api/get-link',
    description: 'فك التشفير واستخراج روابط البث والتحميل المباشرة (.mp4 / .m3u8) بجودات متعددة مع تخطي صفحات الانتظار.',
    category: 'Streaming',
    params: [
      { name: 'url', type: 'string', required: true, description: 'رابط الفيلم أو الحلقة في ak.sv', example: 'https://ak.sv/movie/1234/title' }
    ],
    exampleResponse: {
      success: true,
      data: [
        { quality: "1080p", url: "https://downet.net/download/...", isM3u8: false },
        { quality: "720p", url: "https://downet.net/download/...", isM3u8: false },
        { quality: "480p", url: "https://downet.net/download/...", isM3u8: false }
      ]
    }
  },
  {
    method: 'GET',
    path: '/embed',
    description: 'مشغل سينمائي 16:9 مدمج بدون إعلانات مع دعم الترجمة والتحكم في الجودة (على غرار 2Embed.cc).',
    category: 'Embed',
    params: [
      { name: 'url', type: 'string', required: true, description: 'رابط العمل في ak.sv أو رابط البث المباشر', example: 'https://ak.sv/movie/1234/title' },
      { name: 'autoplay', type: 'boolean', required: false, description: 'تشغيل تلقائي (0 أو 1)', example: '1' },
      { name: 'mode', type: 'string', required: false, description: 'نوع المشغل (direct أو proxy)', example: 'direct' }
    ],
    exampleResponse: "<!-- يتم تضمينه عبر <iframe> في أي موقع -->\n<iframe src=\"https://your-domain/embed?url=https://ak.sv/movie/1234/title\" width=\"100%\" height=\"100%\" frameborder=\"0\" allowfullscreen></iframe>"
  }
];

export default function ApiDocsModal({ isOpen, onClose, initialQuery = 'Batman', initialUrl = 'https://ak.sv/movie/1234/sample' }: ApiDocsModalProps) {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'playground' | 'embed_guide'>('endpoints');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[0]);
  const [copiedKey, setCopiedKey] = useState<string>('');

  // Playground state
  const [testerEndpoint, setTesterEndpoint] = useState<string>('/api/search');
  const [testerQuery, setTesterQuery] = useState<string>(initialQuery || 'Inception');
  const [testerUrl, setTesterUrl] = useState<string>(initialUrl || 'https://ak.sv/movie/1234');
  const [testerEpisode, setTesterEpisode] = useState<string>('1');
  const [testerLoading, setTesterLoading] = useState<boolean>(false);
  const [testerResponse, setTesterResponse] = useState<any>(null);
  const [testerStatus, setTesterStatus] = useState<number | null>(null);
  const [testerTime, setTesterTime] = useState<number | null>(null);
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'js' | 'python' | 'html'>('js');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const executeTestRequest = async () => {
    setTesterLoading(true);
    setTesterResponse(null);
    setTesterStatus(null);
    const startTime = performance.now();

    let reqUrl = testerEndpoint;
    if (testerEndpoint === '/api/search' || testerEndpoint === '/api/searchtv') {
      reqUrl += `?q=${encodeURIComponent(testerQuery)}`;
    } else if (testerEndpoint === '/api/details' || testerEndpoint === '/api/movie' || testerEndpoint === '/api/get-link') {
      reqUrl += `?url=${encodeURIComponent(testerUrl)}`;
    } else if (testerEndpoint === '/api/tv') {
      reqUrl += `?url=${encodeURIComponent(testerUrl)}${testerEpisode ? `&e=${testerEpisode}` : ''}`;
    } else if (testerEndpoint === '/api/trending' || testerEndpoint === '/api/movies' || testerEndpoint === '/api/series') {
      reqUrl += `?page=1`;
    }

    try {
      const res = await fetch(reqUrl);
      const endTime = performance.now();
      setTesterTime(Math.round(endTime - startTime));
      setTesterStatus(res.status);
      const data = await res.json();
      setTesterResponse(data);
    } catch (err: any) {
      setTesterStatus(500);
      setTesterResponse({ success: false, error: err.message || 'فشل الاتصال بنقطة النهاية' });
    } finally {
      setTesterLoading(false);
    }
  };

  const getEmbedCodeSnippet = (url: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://akwam-streamer.app';
    return `<iframe \n  src="${origin}/embed?url=${encodeURIComponent(url)}"\n  width="100%"\n  height="540"\n  frameborder="0"\n  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"\n  allowfullscreen\n></iframe>`;
  };

  const getTvEmbedCodeSnippet = (seriesUrl: string, season: number = 1, episode: number = 1) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://akwam-streamer.app';
    return `<iframe \n  src="${origin}/embedtv?url=${encodeURIComponent(seriesUrl)}&s=${season}&e=${episode}"\n  width="100%"\n  height="540"\n  frameborder="0"\n  allowfullscreen\n></iframe>`;
  };

  const getCodeSnippet = (lang: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://akwam-streamer.app';
    let fullUrl = `${origin}${testerEndpoint}`;
    if (testerEndpoint === '/api/search' || testerEndpoint === '/api/searchtv') {
      fullUrl += `?q=${encodeURIComponent(testerQuery)}`;
    } else if (testerEndpoint === '/api/details' || testerEndpoint === '/api/movie' || testerEndpoint === '/api/get-link') {
      fullUrl += `?url=${encodeURIComponent(testerUrl)}`;
    } else if (testerEndpoint === '/api/tv') {
      fullUrl += `?url=${encodeURIComponent(testerUrl)}&e=${testerEpisode}`;
    }

    switch (lang) {
      case 'curl':
        return `curl -X GET "${fullUrl}" \\\n  -H "Accept: application/json"`;
      case 'js':
        return `// JavaScript / TypeScript Fetch\nconst response = await fetch("${fullUrl}");\nconst data = await response.json();\nconsole.log(data);`;
      case 'python':
        return `# Python Requests\nimport requests\n\nresponse = requests.get("${fullUrl}")\ndata = response.json()\nprint(data)`;
      case 'html':
        return getEmbedCodeSnippet(testerUrl);
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div 
        id="api-docs-modal-container" 
        className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  ak.sv REST API & 2Embed Engine
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  v2.0 Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                استخراج بيانات البحث، المشاهدة، السيرفرات المباشرة والتضمين من ak.sv
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="hidden sm:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('endpoints')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'endpoints'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                نقاط النهاية (Endpoints)
              </button>
              <button
                onClick={() => setActiveTab('playground')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'playground'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                مختبر الفحص (Playground)
              </button>
              <button
                onClick={() => setActiveTab('embed_guide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'embed_guide'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                أكواد التضمين (2Embed)
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors mr-2"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex sm:hidden border-b border-slate-800 bg-slate-950/40 p-2 gap-1">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`flex-1 py-1.5 text-center rounded-lg text-xs font-medium ${
              activeTab === 'endpoints' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Endpoints
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`flex-1 py-1.5 text-center rounded-lg text-xs font-medium ${
              activeTab === 'playground' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Playground
          </button>
          <button
            onClick={() => setActiveTab('embed_guide')}
            className={`flex-1 py-1.5 text-center rounded-lg text-xs font-medium ${
              activeTab === 'embed_guide' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            2Embed
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'endpoints' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Endpoint List Sidebar */}
              <div className="lg:col-span-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-3">
                  جميع نقاط النهاية المتاحة
                </h3>
                {ENDPOINTS.map((ep) => {
                  const isSelected = selectedEndpoint.path === ep.path;
                  return (
                    <button
                      key={ep.path}
                      onClick={() => setSelectedEndpoint(ep)}
                      className={`w-full text-right p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {ep.method}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ep.category}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-white dir-ltr text-right">
                        {ep.path}
                      </span>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {ep.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Endpoint Details Pane */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {selectedEndpoint.method}
                        </span>
                        <h4 className="text-base font-mono font-bold text-white dir-ltr">
                          {selectedEndpoint.path}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-300 mt-2">
                        {selectedEndpoint.description}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setTesterEndpoint(selectedEndpoint.path);
                        setActiveTab('playground');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      فحص مباشر
                    </button>
                  </div>

                  {/* Parameters Table */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <h5 className="text-xs font-bold uppercase text-slate-400">
                      معلمات الطلب (Query Parameters)
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="py-2 px-2">المعلمة</th>
                            <th className="py-2 px-2">النوع</th>
                            <th className="py-2 px-2">الحالة</th>
                            <th className="py-2 px-2">الوصف</th>
                            <th className="py-2 px-2">مثال</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-sans">
                          {selectedEndpoint.params.map((param) => (
                            <tr key={param.name}>
                              <td className="py-2.5 px-2 font-mono font-semibold text-blue-400">
                                {param.name}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-slate-400">
                                {param.type}
                              </td>
                              <td className="py-2.5 px-2">
                                {param.required ? (
                                  <span className="text-red-400 font-semibold">مطلوب</span>
                                ) : (
                                  <span className="text-slate-500">اختياري</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">
                                {param.description}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-slate-400 dir-ltr text-right">
                                {param.example}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Response Example */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <Braces className="w-3.5 h-3.5 text-blue-400" />
                        نموذج الاستجابة (JSON Response)
                      </h5>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(selectedEndpoint.exampleResponse, null, 2),
                            `resp-${selectedEndpoint.path}`
                          )
                        }
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedKey === `resp-${selectedEndpoint.path}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ JSON</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-64 dir-ltr text-left">
                      {typeof selectedEndpoint.exampleResponse === 'string'
                        ? selectedEndpoint.exampleResponse
                        : JSON.stringify(selectedEndpoint.exampleResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'playground' && (
            <div className="space-y-6">
              {/* Interactive Request Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Select Endpoint */}
                  <div className="w-full md:w-56">
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      نقطة النهاية (Endpoint)
                    </label>
                    <select
                      value={testerEndpoint}
                      onChange={(e) => setTesterEndpoint(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="/api/search">GET /api/search (بحث)</option>
                      <option value="/api/details">GET /api/details (تفاصيل كاملة)</option>
                      <option value="/api/movie">GET /api/movie (فيلم)</option>
                      <option value="/api/tv">GET /api/tv (مسلسل وحلقات)</option>
                      <option value="/api/get-link">GET /api/get-link (روابط مباشرة)</option>
                      <option value="/api/trending">GET /api/trending (شائع)</option>
                      <option value="/api/movies">GET /api/movies (أفلام)</option>
                      <option value="/api/series">GET /api/series (مسلسلات)</option>
                    </select>
                  </div>

                  {/* Input Parameter */}
                  {testerEndpoint.includes('search') ? (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        كلمة البحث (q)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={testerQuery}
                          onChange={(e) => setTesterQuery(e.target.value)}
                          placeholder="اكتب اسم الفيلم أو المسلسل..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && executeTestRequest()}
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  ) : testerEndpoint.includes('trending') || testerEndpoint.includes('movies') || testerEndpoint.includes('series') ? (
                    <div className="flex-1 flex items-end">
                      <p className="text-xs text-slate-400 pb-2">
                        يجلب تلقائياً الصفحة رقم 1 من أحدث الأعمال على ak.sv
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        رابط الصفحة من ak.sv (url)
                      </label>
                      <input
                        type="text"
                        value={testerUrl}
                        onChange={(e) => setTesterUrl(e.target.value)}
                        placeholder="https://ak.sv/movie/..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 dir-ltr text-left"
                        onKeyDown={(e) => e.key === 'Enter' && executeTestRequest()}
                      />
                    </div>
                  )}

                  {/* Optional Episode field if TV */}
                  {testerEndpoint === '/api/tv' && (
                    <div className="w-24">
                      <label className="block text-xs font-bold text-slate-400 mb-1">
                        الحلقة (e)
                      </label>
                      <input
                        type="number"
                        value={testerEpisode}
                        onChange={(e) => setTesterEpisode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Send Button */}
                  <div className="flex items-end">
                    <button
                      onClick={executeTestRequest}
                      disabled={testerLoading}
                      className="w-full md:w-auto px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      {testerLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>إرسال الطلب</span>
                    </button>
                  </div>
                </div>

                {/* Code Snippets Bar */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">كود الاستدعاء:</span>
                    <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                      {(['js', 'curl', 'python', 'html'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLanguage(lang)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition-colors ${
                            codeLanguage === lang
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang === 'html' ? 'iFrame' : lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(getCodeSnippet(codeLanguage), 'snippet')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'snippet' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto dir-ltr text-left">
                  {getCodeSnippet(codeLanguage)}
                </pre>
              </div>

              {/* Response Viewer */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xs font-bold uppercase text-slate-400">
                      استجابة الخادم المباشرة (Server Response)
                    </h4>
                    {testerStatus && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                          testerStatus >= 200 && testerStatus < 300
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        HTTP {testerStatus}
                      </span>
                    )}
                    {testerTime && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {testerTime} ms
                      </span>
                    )}
                  </div>

                  {testerResponse && (
                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(testerResponse, null, 2), 'raw-resp')
                      }
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'raw-resp' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ النتيجة بالكامل</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative">
                  {testerLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">جاري الاتصال بـ ak.sv وفك التشفير...</span>
                    </div>
                  ) : testerResponse ? (
                    <pre className="p-4 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 dir-ltr text-left select-text">
                      {JSON.stringify(testerResponse, null, 2)}
                    </pre>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
                      <Code2 className="w-8 h-8 opacity-40" />
                      <span className="text-xs">
                        اضغط على &quot;إرسال الطلب&quot; لاختبار الاستجابة واستخراج البيانات مباشرة
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'embed_guide' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-white">
                    نظام تضمين 2Embed المتكامل (Embed Player API)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يمكنك تضمين المشغل السينمائي 16:9 في موقعك أو تطبيقك بكل سهولة مع تخطي الإعلانات، ودعم الترجمات العربية التلقائية، وتبديل السيرفرات والجودات.
                </p>
              </div>

              {/* Embed Movies Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">تضمين الأفلام (Embed Movies)</h4>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        getEmbedCodeSnippet('https://ak.sv/movie/1234/sample-movie'),
                        'embed-movie'
                      )
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedKey === 'embed-movie' ? (
                      <span className="text-emerald-400">تم النسخ ✓</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ كود iframe</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  مرر رابط الفيلم من ak.sv إلى المعلمة <code className="text-blue-400 font-mono">url</code>
                </p>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto dir-ltr text-left">
                  {getEmbedCodeSnippet('https://ak.sv/movie/1234/sample-movie')}
                </pre>
              </div>

              {/* Embed TV Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">تضمين المسلسلات بالحلقة والموسم (Embed TV Series)</h4>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        getTvEmbedCodeSnippet('https://ak.sv/series/1020/breaking-bad', 1, 1),
                        'embed-tv'
                      )
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedKey === 'embed-tv' ? (
                      <span className="text-emerald-400">تم النسخ ✓</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ كود iframe</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  حدد رابط المسلسل ورقم الموسم <code className="text-purple-400 font-mono">s</code> ورقم الحلقة <code className="text-purple-400 font-mono">e</code>
                </p>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 overflow-x-auto dir-ltr text-left">
                  {getTvEmbedCodeSnippet('https://ak.sv/series/1020/breaking-bad', 1, 1)}
                </pre>
              </div>

              {/* JSON API Overview */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Braces className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">قائمة روابط الـ JSON API المباشرة</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Search:</span>
                    <span className="text-blue-400 dir-ltr">/api/search?q={'{keyword}'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Movie Details:</span>
                    <span className="text-blue-400 dir-ltr">/api/movie?url={'{url}'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">TV Show & Ep:</span>
                    <span className="text-blue-400 dir-ltr">/api/tv?url={'{url}'}&e={'{ep}'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Direct Streams:</span>
                    <span className="text-blue-400 dir-ltr">/api/get-link?url={'{url}'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>جاهز للاستخدام ومفتوح المصدر (CORS Enabled)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
