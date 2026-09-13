"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Volume2, VolumeX, Maximize2, Minimize2, Play, Pause } from "lucide-react";

function requestElementFullscreen(el) {
  if (!el) return Promise.reject(new Error("no element"));
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
  return Promise.reject(new Error("fullscreen unsupported"));
}

function exitElementFullscreen() {
  if (document.fullscreenElement) return document.exitFullscreen();
  if (document.webkitFullscreenElement) return document.webkitExitFullscreen?.();
  if (document.msFullscreenElement) return document.msExitFullscreen?.();
  return Promise.resolve();
}

function isNativeFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement,
  );
}

export default function FeedVideoFullscreen({
  clip,
  isEn,
  open,
  onClose,
  startTime = 0,
}) {
  const shellRef = useRef(null);
  const videoRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(async () => {
    try {
      await exitElementFullscreen();
    } catch {
      /* ignore */
    }
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    setFailed(false);
    setPlaying(true);
    setMuted(false);

    const video = videoRef.current;
    if (video) {
      video.currentTime = startTime;
      video.play().catch(() => setPlaying(false));
    }

    const onKey = (event) => {
      if (event.key === "Escape" && !isNativeFullscreenActive()) {
        handleClose();
      }
    };

    const onFsChange = () => {
      setNativeFs(isNativeFullscreenActive());
    };

    document.body.classList.add("feed-video-fullscreen-open");
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    return () => {
      document.body.classList.remove("feed-video-fullscreen-open");
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [open, startTime, handleClose]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleNativeFullscreen = async () => {
    const shell = shellRef.current;
    const video = videoRef.current;
    if (!shell) return;

    try {
      if (isNativeFullscreenActive()) {
        await exitElementFullscreen();
        return;
      }

      try {
        await requestElementFullscreen(shell);
      } catch {
        if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        } else if (video?.requestFullscreen) {
          await video.requestFullscreen();
        }
      }
    } catch {
      /* overlay still usable */
    }
  };

  if (!mounted || !open || !clip) return null;

  const title = isEn ? clip.titleEn : clip.titleEs;

  return createPortal(
    <div
      className="feed-video-fullscreen"
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="feed-video-fullscreen__backdrop" onClick={handleClose} aria-hidden />

      <div className="feed-video-fullscreen__panel">
        <header className="feed-video-fullscreen__bar">
          <div className="feed-video-fullscreen__meta">
            <p className="feed-video-fullscreen__title">{title}</p>
            <p className="feed-video-fullscreen__track">{clip.track}</p>
          </div>
          <div className="feed-video-fullscreen__actions">
            <button
              type="button"
              className="feed-video-fullscreen__btn"
              onClick={() => setMuted((value) => !value)}
              aria-label={muted ? (isEn ? "Unmute" : "Activar sonido") : isEn ? "Mute" : "Silenciar"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              type="button"
              className="feed-video-fullscreen__btn"
              onClick={toggleNativeFullscreen}
              aria-label={
                nativeFs
                  ? isEn
                    ? "Exit fullscreen"
                    : "Salir de pantalla completa"
                  : isEn
                    ? "Enter fullscreen"
                    : "Pantalla completa"
              }
            >
              {nativeFs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              className="feed-video-fullscreen__btn feed-video-fullscreen__btn--close"
              onClick={handleClose}
              aria-label={isEn ? "Close" : "Cerrar"}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="feed-video-fullscreen__stage">
          {failed ? (
            <div className="feed-video-fullscreen__fallback">
              <Play size={40} strokeWidth={1.5} />
              <p>{isEn ? "Video unavailable" : "Video no disponible"}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="feed-video-fullscreen__video"
              src={clip.src}
              poster={clip.poster}
              playsInline
              loop
              muted={muted}
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
            />
          )}

          {!failed ? (
            <button
              type="button"
              className="feed-video-fullscreen__play"
              onClick={togglePlay}
              aria-label={playing ? (isEn ? "Pause" : "Pausar") : isEn ? "Play" : "Reproducir"}
            >
              {playing ? <Pause size={36} /> : <Play size={36} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
