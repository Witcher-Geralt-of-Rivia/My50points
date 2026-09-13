"use client";

import { useCallback, useMemo, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import ModalityPageShell from "@/frontend/components/modalities/ModalityPageShell";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import FeedVideoCard from "@/frontend/components/feed/FeedVideoCard";
import FeedVideoFullscreen from "@/frontend/components/feed/FeedVideoFullscreen";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getFeedPageSections } from "@/frontend/lib/config/feedVideos";
import {
  readPersistedModality,
  isValidModalityId,
} from "@/frontend/lib/gameModalities";

const STORAGE_KEY = "50pts-feed-hidden-sections";

function useHiddenSections() {
  const [hidden, setHidden] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const hide = useCallback((id) => {
    setHidden((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const restore = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHidden([]);
  }, []);

  return { hidden, hide, restore };
}

function FeedSection({ section, t, isEn, onHide, onOpenFullscreen }) {
  const label = t(section.labelKey) || section.id;

  return (
    <section className="feed-section">
      <div className="feed-section__head">
        <h2 className="feed-section__title">{label}</h2>
        <button
          type="button"
          className="feed-section__close"
          onClick={() => onHide(section.id)}
          aria-label={isEn ? `Hide ${label}` : `Ocultar ${label}`}
        >
          <X size={14} />
          <span className="sr-only">{isEn ? "Hide" : "Ocultar"}</span>
        </button>
      </div>
      <div className="feed-section__items">
        {section.videos.map((clip) => (
          <div key={clip.id} className="feed-item">
            <FeedVideoCard
              clip={clip}
              isEn={isEn}
              mode="fullscreen"
              onOpenFullscreen={onOpenFullscreen}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FeedPageClient() {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const { hidden, hide, restore } = useHiddenSections();
  const [fullscreenClip, setFullscreenClip] = useState(null);
  const [fullscreenTime, setFullscreenTime] = useState(0);
  const modalityId = isValidModalityId(null) ? null : readPersistedModality() || "free";

  const sections = useMemo(() => getFeedPageSections(), []);
  const visible = sections.filter((section) => !hidden.includes(section.id));

  const handleOpenFullscreen = useCallback((clip, videoEl) => {
    setFullscreenTime(videoEl?.currentTime || 0);
    setFullscreenClip(clip);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenClip(null);
    setFullscreenTime(0);
  }, []);

  return (
    <ModalityPageShell modalityId={modalityId} className="feed-page">
      <AppPageHeader
        title={t("feed.title") || "FEED"}
        subtitle={t("feed.subtitle") || "Jugadores, tendencias y carreras en vivo"}
        filters={
          hidden.length > 0 ? (
            <button type="button" className="feed-restore-btn" onClick={restore}>
              <RotateCcw size={12} />
              {t("feed.restoreSections") || "Restaurar secciones"}
            </button>
          ) : null
        }
      />

      <div className="feed-page__content">
        {visible.length === 0 ? (
          <div className="feed-empty">
            <p>{t("feed.allHidden") || "Todas las secciones están ocultas."}</p>
            <button type="button" className="feed-restore-btn" onClick={restore}>
              <RotateCcw size={14} />
              {t("feed.restoreSections") || "Restaurar secciones"}
            </button>
          </div>
        ) : (
          <>
            {visible.map((section) => (
              <FeedSection
                key={section.id}
                section={section}
                t={t}
                isEn={isEn}
                onHide={hide}
                onOpenFullscreen={handleOpenFullscreen}
              />
            ))}
            <p className="feed-page__hint">
              {isEn
                ? "Tap any clip for fullscreen · responsive on mobile, tablet and desktop"
                : "Toca cualquier clip para pantalla completa · adaptable a movil, tablet y escritorio"}
            </p>
          </>
        )}
      </div>

      <FeedVideoFullscreen
        clip={fullscreenClip}
        isEn={isEn}
        open={Boolean(fullscreenClip)}
        onClose={handleCloseFullscreen}
        startTime={fullscreenTime}
      />
    </ModalityPageShell>
  );
}
