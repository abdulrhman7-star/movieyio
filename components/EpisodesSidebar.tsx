"use client";

import React, { useState, useMemo } from 'react';
import { Search, Play, Tv, Sparkles, Filter, X, Film, CheckCircle2 } from 'lucide-react';
import type { MediaItem } from '@/lib/akwam';

interface EpisodesSidebarProps {
  episodes: MediaItem[];
  currentEpisodeUrl?: string;
  onSelectEpisode: (episode: MediaItem) => void;
  seriesTitle?: string;
}

export default function EpisodesSidebar({
  episodes,
  currentEpisodeUrl,
  onSelectEpisode,
  seriesTitle = 'حلقات المسلسل',
}: EpisodesSidebarProps) {
  const [filterText, setFilterText] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<string>('all');

  // Compute episode ranges for long series (e.g., 1-25, 26-50...)
  const ranges = useMemo(() => {
    const total = episodes.length;
    if (total <= 25) return [];

    const list: { label: string; min: number; max: number }[] = [];
    const step = 25;
    for (let i = 0; i < total; i += step) {
      const min = i + 1;
      const max = Math.min(i + step, total);
      list.push({
        label: `${min} - ${max}`,
        min,
        max
      });
    }
    return list;
  }, [episodes.length]);

  // Filter episodes based on search query & range
  const filteredEpisodes = useMemo(() => {
    let result = episodes;

    // Apply Range Filter if selected
    if (selectedRange !== 'all') {
      const match = selectedRange.match(/(\d+)\s*-\s*(\d+)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        result = result.slice(min - 1, max);
      }
    }

    // Apply Text Filter
    const query = filterText.trim().toLowerCase();
    if (!query) return result;

    return result.filter((ep, idx) => {
      const titleMatch = ep.title.toLowerCase().includes(query);
      const epNumMatch = `الحلقة ${idx + 1}`.toLowerCase().includes(query) || `${idx + 1}` === query;
      const rawMatch = ep.title.replace(/\D/g, '').includes(query);
      return titleMatch || epNumMatch || rawMatch;
    });
  }, [episodes, filterText, selectedRange]);

  return (
    <div
      id="episodes-sidebar-container"
      className="bg-gray-900/90 border border-gray-800/80 rounded-2xl p-4 flex flex-col h-[520px] lg:h-full max-h-[640px] shadow-2xl backdrop-blur-md"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white line-clamp-1">{seriesTitle}</h3>
            <span className="text-[11px] text-gray-400">
              {episodes.length} حلقة متوفرة
            </span>
          </div>
        </div>

        {filterText && (
          <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
            {filteredEpisodes.length} نتيجة
          </span>
        )}
      </div>

      {/* Text Filter Search Bar */}
      <div className="mt-3 relative">
        <input
          id="episodes-filter-input"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="ابحث برقم الحلقة أو العنوان (مثال: 5، الحلقة 12)..."
          className="w-full bg-gray-800/90 border border-gray-700/80 focus:border-blue-500 text-white text-xs rounded-xl pr-9 pl-8 py-2.5 outline-none transition-all placeholder:text-gray-500"
        />
        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        {filterText && (
          <button
            onClick={() => setFilterText('')}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Range Chips for long series */}
      {ranges.length > 0 && !filterText && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
          <button
            onClick={() => setSelectedRange('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-all ${
              selectedRange === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            الكل ({episodes.length})
          </button>
          {ranges.map((r) => (
            <button
              key={r.label}
              onClick={() => setSelectedRange(r.label)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition-all ${
                selectedRange === r.label
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Episodes List */}
      <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-2 select-none">
        {filteredEpisodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Film className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400 text-xs font-medium">لم يتم العثور على حلقات تطابق &quot;{filterText}&quot;</p>
            <button
              onClick={() => setFilterText('')}
              className="mt-2 text-xs text-blue-400 hover:underline"
            >
              مسح الفلتر
            </button>
          </div>
        ) : (
          filteredEpisodes.map((ep, idx) => {
            const isCurrent = currentEpisodeUrl === ep.url;
            return (
              <div
                key={`ep-item-${ep.url}-${idx}`}
                id={`ep-row-${idx}`}
                onClick={() => onSelectEpisode(ep)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                  isCurrent
                    ? 'bg-blue-600/20 border-blue-500/80 shadow-lg shadow-blue-500/10'
                    : 'bg-gray-800/60 hover:bg-gray-800 border-gray-700/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Episode Index / Indicator */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                        : 'bg-gray-700/80 text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-colors'
                    }`}
                  >
                    {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : idx + 1}
                  </div>

                  {/* Title & metadata */}
                  <div className="min-w-0">
                    <h4
                      className={`text-xs font-semibold truncate transition-colors ${
                        isCurrent ? 'text-blue-300 font-bold' : 'text-gray-200 group-hover:text-white'
                      }`}
                    >
                      {ep.title}
                    </h4>
                    {ep.quality && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        {ep.quality}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0 mr-2">
                  {isCurrent ? (
                    <div className="flex items-center gap-1 text-blue-400">
                      <span className="w-1 h-3 bg-blue-400 animate-pulse"></span>
                      <span className="w-1 h-4 bg-blue-400 animate-pulse delay-75"></span>
                      <span className="w-1 h-2 bg-blue-400 animate-pulse delay-150"></span>
                    </div>
                  ) : (
                    <Play className="w-3.5 h-3.5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
