"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getFeedVideos } from "@/frontend/lib/config/feedVideos";
import FeedVideoCard from "@/frontend/components/feed/FeedVideoCard";
import FeedVideoFullscreen from "@/frontend/components/feed/FeedVideoFullscreen";

const SEGMENTS = [
  { id: "hot", labelEs: "Jugadores Hot", labelEn: "Hot Players" },
  { id: "live", labelEs: "Carreras en Vivo", labelEn: "Live Races" },
  { id: "trending", labelEs: "Tendencias", labelEn: "Trending" },
];

export default function VideoFeedPreview() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [expanded, setExpanded] = useState(false);
  const [activeSegment, setActiveSegment] = useState("live");
  const [playingId, setPlayingId] = useState(null);
  const [fullscreenClip, setFullscreenClip] = useState(null);
  const [fullscreenTime, setFullscreenTime] = useState(0);
  const activeVideoRef = useRef(null);

  const allClips = useMemo(() => getFeedVideos(), []);

  const visibleClips = useMemo(
    () => allClips.filter((clip) => clip.segment === activeSegment),
    [allClips, activeSegment],
  );

  const handleTogglePlay = useCallback((id, videoEl) => {
    if (activeVideoRef.current && activeVideoRef.current !== videoEl) {
      activeVideoRef.current.pause();
      activeVideoRef.current.currentTime = 0;
    }
    if (id && videoEl) {
      videoEl.play().catch(() => {});
      activeVideoRef.current = videoEl;
      setPlayingId(id);
    } else {
      activeVideoRef.current = null;
      setPlayingId(null);
    }
  }, []);

  const handleOpenFullscreen = useCallback((clip, videoEl) => {
    if (activeVideoRef.current && activeVideoRef.current !== videoEl) {
      activeVideoRef.current.pause();
      activeVideoRef.current.currentTime = 0;
    }
    if (videoEl) {
      videoEl.pause();
    }
    setFullscreenTime(videoEl?.currentTime || 0);
    setFullscreenClip(clip);
    setPlayingId(null);
    activeVideoRef.current = null;
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenClip(null);
    setFullscreenTime(0);
  }, []);

  return (
    <>
      <section className="mt-12 sm:mt-16 feed-preview">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.05] transition-colors"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-light">
              Feed
            </p>
            <p className="text-sm font-bold text-white">
              {isEn ? "Highlights & moments" : "Momentos y highlights"}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </button>

        {expanded ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-4 feed-preview__panel">
            <div className="feed-preview__tabs" role="tablist">
              {SEGMENTS.map((seg) => {
                const segLabel = isEn ? seg.labelEn : seg.labelEs;
                const count = allClips.filter((c) => c.segment === seg.id).length;
                const isActive = activeSegment === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveSegment(seg.id)}
                    className={`feed-preview__tab${isActive ? " feed-preview__tab--active" : ""}`}
                  >
                    {segLabel} ({count})
                  </button>
                );
              })}
            </div>

            {visibleClips.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">
                {isEn ? "No clips in this category." : "No hay clips en esta categoria."}
              </p>
            ) : (
              <div className="feed-preview__grid">
                {visibleClips.map((clip) => (
                  <FeedVideoCard
                    key={clip.id}
                    clip={clip}
                    isEn={isEn}
                    mode="inline"
                    isPlaying={playingId === clip.id}
                    onTogglePlay={handleTogglePlay}
                    onOpenFullscreen={handleOpenFullscreen}
                  />
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-zinc-600">
              {isEn
                ? `${visibleClips.length} clips · double-click or expand icon for fullscreen`
                : `${visibleClips.length} clips · doble clic o icono expandir para pantalla completa`}
            </p>
          </div>
        ) : null}
      </section>

      <FeedVideoFullscreen
        clip={fullscreenClip}
        isEn={isEn}
        open={Boolean(fullscreenClip)}
        onClose={handleCloseFullscreen}
        startTime={fullscreenTime}
      />
    </>
  );
}
