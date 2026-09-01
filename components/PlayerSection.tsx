"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Subtitles,
  Upload,
  RefreshCw,
  AlertCircle,
  Share2,
  Code2,
  Download,
  Check,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Shield,
  MonitorPlay,
  ChevronDown
} from 'lucide-react';

export interface VideoQuality {
  quality: string;
  url: string;
  isM3u8?: boolean;
}

export interface SubtitleTrack {
  label: string;
  lang: string;
  src: string;
}

interface PlayerSectionProps {
  title: string;
  poster?: string;
  qualities: VideoQuality[];
  subtitles?: SubtitleTrack[];
  initialQualityIdx?: number;
  initialMode?: 'direct' | 'proxy';
  onEmbedClick?: () => void;
  onRefreshLink?: () => void;
  isRefreshing?: boolean;
}

function srtToVtt(srtText: string): string {
  return 'WEBVTT\n\n' + srtText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}

export default function PlayerSection({
  title,
  poster,
  qualities,
  subtitles = [],
  initialQualityIdx = 0,
  initialMode = 'direct',
  onEmbedClick,
  onRefreshLink,
  isRefreshing = false,
}: PlayerSectionProps) {
  const [selectedQualityIdx, setSelectedQualityIdx] = useState<number>(initialQualityIdx);
  const [streamMode, setStreamMode] = useState<'direct' | 'proxy'>(initialMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTheater, setIsTheater] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasAutoSwitchedToProxy, setHasAutoSwitchedToProxy] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Subtitle states
  const [customSubtitles, setCustomSubtitles] = useState<SubtitleTrack[]>([]);
  const activeSubtitles = useMemo(() => [...customSubtitles, ...(subtitles || [])], [customSubtitles, subtitles]);
  const [selectedSubIdx, setSelectedSubIdx] = useState<number>(-1); // -1 = off
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(false);
  const [subSize, setSubSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [activeTrackBlobUrl, setActiveTrackBlobUrl] = useState<string | null>(null);

  // Menus
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentQuality = qualities[selectedQualityIdx] || qualities[0];

  // Compute effective stream URL
  const effectiveStreamUrl = currentQuality
    ? streamMode === 'direct'
      ? currentQuality.url
      : `/api/stream?url=${encodeURIComponent(currentQuality.url)}`
    : '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Handle HLS vs MP4 attachment
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveStreamUrl) return;

    setIsLoading(true);
    setErrorMessage('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3u8Url =
      currentQuality?.isM3u8 ||
      effectiveStreamUrl.toLowerCase().includes('.m3u8') ||
      currentQuality?.url?.toLowerCase().includes('.m3u8');

    if (isM3u8Url && Hls.isSupported() && streamMode === 'direct') {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      });
      hlsRef.current = hls;
      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Automatic CORS / network fallback to proxy
              if (streamMode === 'direct' && !hasAutoSwitchedToProxy) {
                setHasAutoSwitchedToProxy(true);
                setStreamMode('proxy');
                showToast('تم التحويل تلقائياً لمسرّع البث لتجاوز حظر CORS من المصدر');
              } else {
                setErrorMessage('فشل تحميل بث الفيديو الشبكي');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = effectiveStreamUrl;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveStreamUrl, streamMode, currentQuality?.url, currentQuality?.isM3u8, hasAutoSwitchedToProxy]);

  // Video listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(video.duration || 0);
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onError = () => {
      setIsLoading(false);
      // Automatic fallback on error when using direct mode
      if (streamMode === 'direct' && !hasAutoSwitchedToProxy) {
        setHasAutoSwitchedToProxy(true);
        setStreamMode('proxy');
        showToast('تم التحويل التلقائي لخادم فك التشفير وCORS');
      } else {
        setErrorMessage('تعذر تشغيل هذا الرابط. قد يكون السيرفر منتهي الصلاحية، اضغط تحديث الرابط.');
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('progress', onProgress);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('error', onError);
    };
  }, [streamMode, hasAutoSwitchedToProxy]);

  // Subtitle track management
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove existing custom track elements
    const oldTracks = video.querySelectorAll('track');
    oldTracks.forEach((t) => t.remove());

    if (!subtitlesEnabled || selectedSubIdx < 0) {
      return;
    }

    const sub = activeSubtitles[selectedSubIdx];
    if (!sub) return;

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = sub.label;
    track.srclang = sub.lang;
    track.src = sub.src;
    track.default = true;

    video.appendChild(track);

    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'showing';
      }
    }
  }, [subtitlesEnabled, selectedSubIdx, activeSubtitles]);

  // Handle local subtitle upload (.vtt or .srt)
  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      let vttContent = content;
      if (file.name.toLowerCase().endsWith('.srt')) {
        vttContent = srtToVtt(content);
      }

      if (activeTrackBlobUrl) {
        URL.revokeObjectURL(activeTrackBlobUrl);
      }

      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      setActiveTrackBlobUrl(blobUrl);

      const newSub: SubtitleTrack = {
        label: file.name.replace(/\.(vtt|srt)$/i, '') || 'ترجمة مخصصة',
        lang: 'ar',
        src: blobUrl
      };

      setCustomSubtitles((prev) => [newSub, ...prev]);
      setSelectedSubIdx(0);
      setSubtitlesEnabled(true);
      setShowSubtitlesMenu(false);
      showToast(`تم تحميل ملف الترجمة: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showSubtitlesMenu && !showQualityMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const skipSeconds = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + sec));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  const handleQualityChange = (idx: number) => {
    if (!qualities[idx]) return;
    const prevTime = videoRef.current?.currentTime || 0;
    const wasPlaying = videoRef.current ? !videoRef.current.paused : false;

    setSelectedQualityIdx(idx);
    setShowQualityMenu(false);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = prevTime;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 150);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full transition-all duration-300 ${isTheater ? 'max-w-none' : 'max-w-6xl'} mx-auto`} dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600/95 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-2xl backdrop-blur-md border border-blue-400/40 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 16:9 Cinema Container */}
      <div
        ref={containerRef}
        id="player-cinema-canvas"
        className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800/80 group select-none ${
          isFullscreen ? 'rounded-none h-screen w-screen' : ''
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={(e) => {
          // Close open dropdowns if clicking canvas
          if ((e.target as HTMLElement).tagName === 'VIDEO') {
            togglePlay();
            setShowSettingsMenu(false);
            setShowSubtitlesMenu(false);
            setShowQualityMenu(false);
          }
        }}
      >
        {/* Loading Spinner */}
        {isLoading && !errorMessage && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <MonitorPlay className="w-6 h-6 text-blue-400 absolute animate-pulse" />
            </div>
            <span className="mt-3 text-xs font-semibold text-gray-300 tracking-wider">جاري تحميل البث المباشر...</span>
          </div>
        )}

        {/* Error Overlay */}
        {errorMessage && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-950/95 p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-white text-base font-bold mb-1">تعذر تشغيل هذا الرابط</h3>
            <p className="text-gray-400 text-xs max-w-md mb-5 leading-relaxed">{errorMessage}</p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {streamMode === 'direct' ? (
                <button
                  id="btn-switch-proxy"
                  onClick={() => {
                    setStreamMode('proxy');
                    setErrorMessage('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  <Shield className="w-4 h-4" /> التبديل إلى البروكسي (Proxy)
                </button>
              ) : (
                <button
                  id="btn-switch-direct"
                  onClick={() => {
                    setStreamMode('direct');
                    setErrorMessage('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  <Zap className="w-4 h-4" /> تجربة البث المباشر (Direct)
                </button>
              )}

              {onRefreshLink && (
                <button
                  id="btn-player-refresh"
                  onClick={() => {
                    setErrorMessage('');
                    onRefreshLink();
                  }}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  توليد رابط جديد
                </button>
              )}
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          className={`w-full h-full object-contain cursor-pointer ${
            subSize === 'small' ? '[&::cue]:text-sm' : subSize === 'large' ? '[&::cue]:text-2xl' : '[&::cue]:text-lg'
          } [&::cue]:bg-black/75 [&::cue]:text-white [&::cue]:rounded-lg [&::cue]:px-2`}
        />

        {/* Big Center Play/Pause Button on hover */}
        {!isLoading && !errorMessage && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
              !isPlaying || showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={togglePlay}
              className="pointer-events-auto p-4 md:p-5 rounded-full bg-blue-600/80 hover:bg-blue-500 text-white shadow-2xl backdrop-blur-md transform transition-transform hover:scale-110 active:scale-95"
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10" /> : <Play className="w-8 h-8 md:w-10 md:h-10 translate-x-0.5" />}
            </button>
          </div>
        )}

        {/* Custom Player Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 md:p-4 z-20 transition-all duration-300 ${
            showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Progress / Seek Bar */}
          <div className="relative group/seek mb-3 flex items-center cursor-pointer">
            {/* Buffered track */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gray-600/60 rounded-full pointer-events-none"
              style={{ width: `${(buffered / (duration || 1)) * 100}%` }}
            />
            {/* Played track */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full pointer-events-none"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 appearance-none bg-gray-800/80 rounded-full cursor-pointer accent-blue-500 focus:outline-none focus:h-2 transition-all hover:h-1.5"
            />
          </div>

          {/* Bottom Bar Controls */}
          <div className="flex items-center justify-between gap-2 text-white">
            {/* Left group: Play, skip, volume, time */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                id="btn-ctrl-play"
                onClick={togglePlay}
                className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                title={isPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={() => skipSeconds(-10)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="إرجاع 10 ثواني"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => skipSeconds(10)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="تقديم 10 ثواني"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  id="btn-ctrl-mute"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-14 md:w-20 h-1 appearance-none bg-gray-700 rounded-full cursor-pointer accent-blue-500 hidden group-hover/vol:inline-block md:inline-block"
                />
              </div>

              {/* Time display */}
              <span className="text-xs font-mono text-gray-300 mr-2 select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right group: Quality, Subtitles, Settings, Fullscreen */}
            <div className="flex items-center gap-1 md:gap-2 relative">
              {/* Quality Menu Trigger */}
              <div className="relative">
                <button
                  id="btn-ctrl-quality"
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSubtitlesMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>{currentQuality?.quality || '1080p'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Quality Dropdown */}
                {showQualityMenu && (
                  <div className="absolute bottom-10 left-0 bg-gray-900/95 border border-gray-700/80 rounded-xl p-2 shadow-2xl backdrop-blur-lg min-w-36 z-30 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">الجودة المتاحة</span>
                    {qualities.map((q, idx) => (
                      <button
                        key={`quality-${idx}`}
                        onClick={() => handleQualityChange(idx)}
                        className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors text-right ${
                          selectedQualityIdx === idx ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span>{q.quality}</span>
                        {selectedQualityIdx === idx && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitles Menu Trigger */}
              <div className="relative">
                <button
                  id="btn-ctrl-subtitles"
                  onClick={() => {
                    setShowSubtitlesMenu(!showSubtitlesMenu);
                    setShowQualityMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                    subtitlesEnabled ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-white/10'
                  }`}
                  title="الترجمة والمزامنة"
                >
                  <Subtitles className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                {/* Subtitles Dropdown */}
                {showSubtitlesMenu && (
                  <div className="absolute bottom-10 left-0 bg-gray-900/95 border border-gray-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-lg min-w-56 z-30 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Subtitles className="w-3.5 h-3.5 text-blue-400" /> الترجمة المصاحبة
                      </span>
                      <button
                        onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          subtitlesEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {subtitlesEnabled ? 'مفعّلة' : 'معطّلة'}
                      </button>
                    </div>

                    {/* Subtitle list */}
                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedSubIdx(-1);
                          setSubtitlesEnabled(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg ${
                          selectedSubIdx === -1 || !subtitlesEnabled ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span>إيقاف الترجمة</span>
                        {(selectedSubIdx === -1 || !subtitlesEnabled) && <Check className="w-3 h-3" />}
                      </button>

                      {activeSubtitles.map((sub, idx) => (
                        <button
                          key={`sub-${idx}`}
                          onClick={() => {
                            setSelectedSubIdx(idx);
                            setSubtitlesEnabled(true);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg ${
                            selectedSubIdx === idx && subtitlesEnabled ? 'bg-blue-600 text-white font-bold' : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {selectedSubIdx === idx && subtitlesEnabled && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>

                    {/* Upload custom subtitle */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".vtt,.srt"
                      onChange={handleSubtitleUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 mt-1 bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-semibold rounded-lg border border-gray-700 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" /> رفع ملف ترجمة (.vtt / .srt)
                    </button>

                    {/* Subtitle Font Size */}
                    <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                      <span>حجم الخط:</span>
                      <div className="flex gap-1">
                        {(['small', 'medium', 'large'] as const).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSubSize(sz)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              subSize === sz ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {sz === 'small' ? 'صغير' : sz === 'medium' ? 'وسط' : 'كبير'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Speed / Settings Trigger */}
              <div className="relative">
                <button
                  id="btn-ctrl-settings"
                  onClick={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowQualityMenu(false);
                    setShowSubtitlesMenu(false);
                  }}
                  className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  title="السرعة والإعدادات"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                {/* Settings Dropdown */}
                {showSettingsMenu && (
                  <div className="absolute bottom-10 left-0 bg-gray-900/95 border border-gray-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-lg min-w-44 z-30 flex flex-col gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-gray-800">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" /> سرعة التشغيل
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                        <button
                          key={sp}
                          onClick={() => handleSpeedChange(sp)}
                          className={`py-1 text-xs rounded-md text-center font-mono ${
                            playbackSpeed === sp ? 'bg-blue-600 text-white font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {sp}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                id="btn-ctrl-fullscreen"
                onClick={toggleFullscreen}
                className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar Beneath Cinema Player */}
      <div className="mt-4 bg-gray-900/90 border border-gray-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        {/* Stream Source Mode Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-800/90 p-1 rounded-xl border border-gray-700/60">
            <button
              onClick={() => {
                setStreamMode('direct');
                setErrorMessage('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                streamMode === 'direct'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>مباشر (Direct)</span>
            </button>
            <button
              onClick={() => {
                setStreamMode('proxy');
                setErrorMessage('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                streamMode === 'proxy'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>بروكسي وتجاوز الحظر (Proxy)</span>
            </button>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            بث عالي السرعة
          </span>
        </div>

        {/* Action Buttons: Embed, Refresh, Download, Share */}
        <div className="flex items-center flex-wrap gap-2">
          {onEmbedClick && (
            <button
              id="btn-embed-player"
              onClick={onEmbedClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700/80 transition-all hover:text-white"
            >
              <Code2 className="w-4 h-4 text-blue-400" />
              <span>تضمين (Embed)</span>
            </button>
          )}

          {currentQuality?.url && (
            <a
              id="btn-download-media"
              href={currentQuality.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700/80 transition-all hover:text-white"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تحميل ({currentQuality.quality})</span>
            </a>
          )}

          {onRefreshLink && (
            <button
              id="btn-refresh-token"
              onClick={onRefreshLink}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700/80 transition-all hover:text-white"
              title="توليد توكن ورابط جديد من المصدر"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث الرابط</span>
            </button>
          )}

          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast('تم نسخ رابط الصفحة بنجاح');
              }
            }}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700/80 transition-all hover:text-white"
            title="مشاركة"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
