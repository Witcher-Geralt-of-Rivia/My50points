"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Play, Pause } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getFeedVideos } from "@/frontend/lib/config/feedVideos";
import ModalityTorneoBar, { ModalityColorStripes } from "@/frontend/components/modality-workspace/ModalityTorneoBar";

function VideoChip({ clip, isEn, isPlaying, onTogglePlay }) {
  const videoRef = useRef(null);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) onTogglePlay(clip.id, video);
    else {
      video.pause();
      onTogglePlay(null, null);
    }
  };

  return (
    <button
      type="button"
      className="mw-media-strip__video-chip"
      onClick={handleToggle}
      aria-label={isEn ? `Play ${clip.titleEn}` : `Reproducir ${clip.titleEs}`}
    >
      <video
        ref={videoRef}
        className="mw-media-strip__video"
        src={clip.src}
        poster={clip.poster}
        muted
        playsInline
        loop
        preload="metadata"
      />
      <span className="mw-media-strip__video-shade" aria-hidden />
      <span className="mw-media-strip__video-play" aria-hidden>
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" strokeWidth={2} />
        ) : (
          <Play className="w-4 h-4 text-white" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}

/** News + video bars; contracts to stacked 4-color strip after modality accept. */
export default function ModalityMediaStrip({ modalityId, contracted = false }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [playingId, setPlayingId] = useState(null);
  const activeVideoRef = useRef(null);
  const videoClips = useMemo(() => getFeedVideos().slice(0, 8), []);
  const newsItems = t("ticketWorkflow.mediaBarNewsItems");
  const newsList = Array.isArray(newsItems) ? newsItems : [];

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

  if (contracted) {
    return (
      <section
        className="mw-media-strip mw-media-strip--contracted"
        aria-label={t("modalityWorkspace.mediaStripContractedAria")}
        data-modality={modalityId}
      >
        <ModalityColorStripes contracted />
      </section>
    );
  }

  return (
    <section
      className="mw-media-strip mw-media-strip--expanded"
      aria-label={t("modalityWorkspace.mediaStripAria")}
      data-modality={modalityId}
    >
      <article className="mw-media-strip__row mw-media-strip__row--news">
        <ModalityTorneoBar t={t} />
        <div className="mw-media-strip__content">
          <header className="mw-media-strip__label-row">
            <h3 className="mw-media-strip__label">{t("ticketWorkflow.mediaBarNews")}</h3>
            <Link href="/chat" className="mw-media-strip__see-all">
              {t("playerHub.seeAll")}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </header>
          <div className="mw-media-strip__scroll mw-media-strip__scroll--news">
            {newsList.map((item) => (
              <div key={item} className="mw-media-strip__news-chip">
                <span className="mw-media-strip__news-dot" aria-hidden />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <ModalityColorStripes />

      <article className="mw-media-strip__row mw-media-strip__row--videos">
        <ModalityTorneoBar t={t} />
        <div className="mw-media-strip__content">
          <header className="mw-media-strip__label-row">
            <h3 className="mw-media-strip__label">{t("ticketWorkflow.mediaBarVideos")}</h3>
            <Link href="/feed" className="mw-media-strip__see-all">
              {t("playerHub.seeAll")}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </header>
          <div className="mw-media-strip__scroll mw-media-strip__scroll--videos">
            {videoClips.map((clip) => (
              <VideoChip
                key={clip.id}
                clip={clip}
                isEn={isEn}
                isPlaying={playingId === clip.id}
                onTogglePlay={handleTogglePlay}
              />
            ))}
          </div>
        </div>
      </article>

      <ModalityColorStripes />
    </section>
  );
}
