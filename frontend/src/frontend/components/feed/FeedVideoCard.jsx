"use client";

import { useRef, useState } from "react";
import { Play, Pause, Maximize2 } from "lucide-react";

/**
 * @param {"inline"|"fullscreen"} mode
 * - inline: play/pause in card + expand to fullscreen
 * - fullscreen: tap opens fullscreen viewer directly
 */
export default function FeedVideoCard({
  clip,
  isEn,
  mode = "inline",
  isPlaying = false,
  onTogglePlay,
  onOpenFullscreen,
  className = "",
}) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  const title = isEn ? clip.titleEn : clip.titleEs;
  const openFullscreen = (event) => {
    event?.stopPropagation?.();
    if (failed) return;
    onOpenFullscreen?.(clip, mode === "inline" ? videoRef.current : null);
  };

  const handleFrameClick = () => {
    if (failed) return;
    if (mode === "fullscreen") {
      openFullscreen();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      onTogglePlay?.(clip.id, video);
    } else {
      video.pause();
      onTogglePlay?.(null, null);
    }
  };

  const handleDoubleClick = (event) => {
    event.preventDefault();
    openFullscreen(event);
  };

  return (
    <article className={`feed-video-card ${className}`.trim()}>
      <div className="feed-video-card__frame-wrap">
        <button
          type="button"
          className={`feed-video-card__frame${mode === "fullscreen" ? " feed-video-card__frame--feed-page" : ""}`}
          onClick={handleFrameClick}
          onDoubleClick={handleDoubleClick}
          aria-label={
            mode === "fullscreen"
              ? isEn
                ? `Open ${clip.titleEn} fullscreen`
                : `Abrir ${clip.titleEs} en pantalla completa`
              : isEn
                ? `Play ${clip.titleEn}`
                : `Reproducir ${clip.titleEs}`
          }
        >
          {failed ? (
            <span className="feed-video-card__fallback" aria-hidden>
              <Play className="w-8 h-8 text-white/70" strokeWidth={1.75} />
            </span>
          ) : (
            <video
              ref={videoRef}
              className="feed-video-card__video"
              src={clip.src}
              poster={clip.poster}
              muted
              playsInline
              loop={mode === "inline"}
              preload="metadata"
              onError={() => setFailed(true)}
            />
          )}
          <span className="feed-video-card__shade" aria-hidden />
          <span className="feed-video-card__play" aria-hidden>
            {mode === "inline" && isPlaying && !failed ? (
              <Pause className="w-7 h-7 text-white" strokeWidth={2} />
            ) : (
              <Play className="w-7 h-7 text-white" strokeWidth={2} />
            )}
          </span>
        </button>
        {!failed ? (
          <button
            type="button"
            className="feed-video-card__fullscreen"
            onClick={openFullscreen}
            aria-label={isEn ? "Fullscreen" : "Pantalla completa"}
            title={isEn ? "Fullscreen" : "Pantalla completa"}
          >
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      <p className="feed-video-card__title">{title}</p>
      <p className="feed-video-card__track">{clip.track}</p>
    </article>
  );
}
