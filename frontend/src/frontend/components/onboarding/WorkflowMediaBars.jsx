"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Film, Info, Newspaper, Play, Pause, ChevronRight } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getFeedVideos } from "@/frontend/lib/config/feedVideos";

function WorkflowVideoChip({ clip, isEn, isPlaying, onTogglePlay }) {
  const videoRef = useRef(null);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      onTogglePlay(clip.id, video);
    } else {
      video.pause();
      onTogglePlay(null, null);
    }
  };

  return (
    <button
      type="button"
      className="workflow-media-bar__video-chip"
      onClick={handleToggle}
      aria-label={isEn ? `Play ${clip.titleEn}` : `Reproducir ${clip.titleEs}`}
    >
      <video
        ref={videoRef}
        className="workflow-media-bar__video"
        src={clip.src}
        muted
        playsInline
        loop
        preload="metadata"
      />
      <span className="workflow-media-bar__video-shade" aria-hidden />
      <span className="workflow-media-bar__video-play" aria-hidden>
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" strokeWidth={2} />
        ) : (
          <Play className="w-5 h-5 text-white" strokeWidth={2} />
        )}
      </span>
      <span className="workflow-media-bar__video-label">
        {isEn ? clip.titleEn : clip.titleEs}
      </span>
    </button>
  );
}

export default function WorkflowMediaBars() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const [playingId, setPlayingId] = useState(null);
  const activeVideoRef = useRef(null);

  const videoClips = useMemo(() => getFeedVideos().slice(0, 6), []);
  const newsItems = t("ticketWorkflow.mediaBarNewsItems");

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

  return (
    <section className="workflow-media-bars" aria-label={t("ticketWorkflow.mediaBarsAria")}>
      <article className="workflow-media-bar workflow-media-bar--videos">
        <header className="workflow-media-bar__head">
          <span className="workflow-media-bar__icon-wrap workflow-media-bar__icon-wrap--videos">
            <Film className="workflow-media-bar__icon" strokeWidth={2} aria-hidden />
          </span>
          <div className="workflow-media-bar__titles">
            <h3 className="workflow-media-bar__title">{t("ticketWorkflow.mediaBarVideos")}</h3>
            <p className="workflow-media-bar__desc">{t("ticketWorkflow.mediaBarVideosDesc")}</p>
          </div>
          <Link href="/inicio#feed" className="workflow-media-bar__link">
            {t("playerHub.seeAll")}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </header>
        <div className="workflow-media-bar__body workflow-media-bar__body--scroll">
          {videoClips.map((clip) => (
            <WorkflowVideoChip
              key={clip.id}
              clip={clip}
              isEn={isEn}
              isPlaying={playingId === clip.id}
              onTogglePlay={handleTogglePlay}
            />
          ))}
        </div>
      </article>

      <article className="workflow-media-bar workflow-media-bar--info">
        <header className="workflow-media-bar__head">
          <span className="workflow-media-bar__icon-wrap workflow-media-bar__icon-wrap--info">
            <Info className="workflow-media-bar__icon" strokeWidth={2} aria-hidden />
          </span>
          <div className="workflow-media-bar__titles">
            <h3 className="workflow-media-bar__title">{t("ticketWorkflow.mediaBarInfo")}</h3>
            <p className="workflow-media-bar__desc">{t("ticketWorkflow.mediaBarInfoDesc")}</p>
          </div>
        </header>
        <div className="workflow-media-bar__body workflow-media-bar__body--info">
          <p className="workflow-media-bar__info-lead">{t("ticketWorkflow.landingLeadDetail1")}</p>
          <Link href="/guia-torneo" className="workflow-media-bar__guide-link">
            {t("floatingMenu.tournamentGuide")}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </article>

      <article className="workflow-media-bar workflow-media-bar--news">
        <header className="workflow-media-bar__head">
          <span className="workflow-media-bar__icon-wrap workflow-media-bar__icon-wrap--news">
            <Newspaper className="workflow-media-bar__icon" strokeWidth={2} aria-hidden />
          </span>
          <div className="workflow-media-bar__titles">
            <h3 className="workflow-media-bar__title">{t("ticketWorkflow.mediaBarNews")}</h3>
            <p className="workflow-media-bar__desc">{t("ticketWorkflow.mediaBarNewsDesc")}</p>
          </div>
          <Link href="/chat" className="workflow-media-bar__link">
            {t("playerHub.seeAll")}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </header>
        <div className="workflow-media-bar__body workflow-media-bar__body--scroll workflow-media-bar__body--news">
          {(Array.isArray(newsItems) ? newsItems : []).map((item) => (
            <div key={item} className="workflow-media-bar__news-chip">
              <span className="workflow-media-bar__news-dot" aria-hidden />
              <span className="workflow-media-bar__news-text">{item}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
