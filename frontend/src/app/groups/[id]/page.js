"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppPageHeader from "@/frontend/components/layout/AppPageHeader";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import { useAuth } from "@/frontend/contexts/AuthContext";

const HOLO_CLASSES = {
  purple:     "hologram-banner",
  aqua:       "hologram-banner hologram-banner--aqua",
  yellow:     "hologram-banner hologram-banner--yellow",
  multicolor: "hologram-banner hologram-banner--multicolor",
};

const HOLO_BORDER_COLORS = {
  purple:     "rgba(168,85,247,0.8)",
  aqua:       "rgba(6,182,212,0.8)",
  yellow:     "rgba(245,158,11,0.8)",
  multicolor: "rgba(168,85,247,0.8)",
};

const EMOJIS = ["🔥", "👑", "🏆", "⚡", "⭐", "💎", "📢", "🚀"];
const HOLO_DURATION_MS = 10_000;

function formatCooldown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Floating hologram overlay shown above chat — auto-dismisses after 10 s */
function HologramOverlay({ hologram, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / HOLO_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
      else onDismiss();
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDismiss]);

  const version = hologram.colorVersion || "purple";
  const borderColor = HOLO_BORDER_COLORS[version] || HOLO_BORDER_COLORS.purple;

  return (
    <motion.div
      className={`hologram-overlay ${HOLO_CLASSES[version]}`}
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Progress bar */}
      <div className="hologram-overlay__progress" style={{ "--holo-border": borderColor }}>
        <motion.div
          className="hologram-overlay__progress-fill"
          style={{ width: `${progress}%`, background: borderColor }}
        />
      </div>

      <div className="hologram-overlay__body">
        <span className="hologram-overlay__emoji" role="img" aria-label="">
          {hologram.emoji}
        </span>
        <div className="hologram-overlay__content">
          <p className="hologram-overlay__author">{hologram.author}</p>
          <p className="hologram-overlay__message">{hologram.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="hologram-overlay__close"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const groupId = params.id;

  const [group, setGroup] = useState(null);
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("🔥");
  const [previews, setPreviews] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("purple");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayHolo, setOverlayHolo] = useState(null);
  const lastHoloIdRef = useRef(null);

  const load = useCallback(() => {
    if (!groupId || !isAuthenticated) return;
    fetchAuthJson(`/groups/${groupId}`)
      .then((data) => {
        setGroup(data.group);
        // Show overlay when a new hologram arrives
        const active = data.group?.activeHologram;
        if (active && active.id !== lastHoloIdRef.current) {
          lastHoloIdRef.current = active.id;
          setOverlayHolo(active);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId, isAuthenticated]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const handlePreview = async () => {
    try {
      const data = await fetchAuthJson(`/groups/${groupId}/hologram/preview`, {
        method: "POST",
        body: JSON.stringify({ message, emoji }),
      });
      setPreviews(data.versions || []);
    } catch {
      // fallback: generate local previews
      setPreviews(
        ["purple", "aqua", "yellow", "multicolor"].map((v) => ({
          version: v,
          preview: `${emoji} ${message}`,
        }))
      );
    }
  };

  const handleSend = async () => {
    await fetchAuthJson(`/groups/${groupId}/hologram`, {
      method: "POST",
      body: JSON.stringify({ message, emoji, colorVersion: selectedVersion }),
    });
    setMessage("");
    setPreviews([]);
    load();
  };

  if (!isAuthenticated) {
    return (
      <p className="text-zinc-500 p-8 text-center">
        Inicia sesion para ver este grupo.
      </p>
    );
  }

  if (loading) return <p className="text-zinc-500 p-8">Cargando...</p>;
  if (!group) return <p className="text-red-400 p-8">{error || "Grupo no encontrado"}</p>;

  const canPublish = group.canPublishHologram;
  const status = group.hologramStatus || {};

  return (
    <div className="group-detail-page">
      <AppPageHeader title={group.name} subtitle={`${group.memberCount} miembros`} />
      <Link href="/groups" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-purple-light mb-6">
        <ArrowLeft className="w-4 h-4" />
        Grupos
      </Link>

      {/* Floating hologram overlay */}
      <AnimatePresence>
        {overlayHolo ? (
          <HologramOverlay hologram={overlayHolo} onDismiss={() => setOverlayHolo(null)} />
        ) : null}
      </AnimatePresence>

      {/* Admin slots */}
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-6">
        <h2 className="text-sm font-bold mb-3">Administracion</h2>
        <ul className="space-y-2 text-sm">
          {group.adminSlots?.map((slot, i) => (
            <li key={i} className="flex items-center gap-2">
              {slot.filled ? (
                <>
                  <span>{slot.role === "founder" ? "👑" : "🛡️"}</span>
                  <span>{slot.username}</span>
                </>
              ) : (
                <>
                  <span className="opacity-40">🛡️</span>
                  <span className="text-zinc-500">Disponible</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Hologram composer */}
      <section className="hologram-composer">
        <h2 className="hologram-composer__title">
          Holograma grupal
          {!canPublish ? <Lock className="w-4 h-4 text-zinc-500" /> : null}
        </h2>

        {!canPublish ? (
          <p className="hologram-composer__locked">
            Solo administradores pueden publicar hologramas. Solicita permisos al fundador o crea tu propio grupo.
          </p>
        ) : (
          <>
            <div className="hologram-composer__status">
              {status.available ? (
                <span className="hologram-composer__status-pill hologram-composer__status-pill--ready">
                  ● Disponible
                </span>
              ) : (
                <span className="hologram-composer__status-pill hologram-composer__status-pill--cooldown">
                  ⏱ Cooldown {formatCooldown(status.secondsRemaining || 0)}
                </span>
              )}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              rows={3}
              className="hologram-composer__textarea"
              placeholder="Mensaje para el grupo (máx. 200 caracteres)..."
            />
            <p className="hologram-composer__char-count">{message.length}/200</p>

            <div className="hologram-composer__emojis">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`hologram-composer__emoji-btn${emoji === e ? " hologram-composer__emoji-btn--active" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="hologram-composer__actions">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!message.trim()}
                className="hologram-composer__btn hologram-composer__btn--preview"
              >
                Ver 4 versiones
              </button>
              <button
                type="button"
                disabled={!status.available || !message.trim() || previews.length === 0}
                onClick={handleSend}
                className="hologram-composer__btn hologram-composer__btn--send"
              >
                <Send className="w-3.5 h-3.5" />
                Publicar holograma
              </button>
            </div>

            {/* 4-version preview grid */}
            <AnimatePresence>
              {previews.length > 0 ? (
                <motion.div
                  className="hologram-previews"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="hologram-previews__label">Elige un tema:</p>
                  <div className="hologram-previews__grid">
                    {previews.map((v) => (
                      <button
                        key={v.version}
                        type="button"
                        onClick={() => setSelectedVersion(v.version)}
                        className={`hologram-previews__item ${HOLO_CLASSES[v.version] || HOLO_CLASSES.purple}${
                          selectedVersion === v.version ? " hologram-previews__item--selected" : ""
                        }`}
                      >
                        <span className="hologram-previews__version-label">{v.version}</span>
                        <span>{emoji} {v.preview || message}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </section>
    </div>
  );
}
