"use client";

import { useState, useEffect, useRef } from "react";
import { logoFile } from "@/frontend/lib/config/paths";
import { useAuth } from "@/frontend/contexts/AuthContext";

/**
 * Cuenta atrás de la identidad de invitado (modalidad 4).
 *
 * El instante de muerte lo manda el SERVIDOR (`user.expiresAt`). Antes se
 * calculaba desde localStorage, que conservaba la fecha del invitado anterior:
 * un alias recién creado nacía marcando "0h 00m". Al llegar a cero se cierra la
 * sesión, porque el backend ya no acepta ese token.
 */
function useGuestCountdown(user, onExpire) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!user || !user.isGuest) {
      setTimeLeft("");
      return undefined;
    }

    const getExpiryMs = () => {
      if (user.expiresAt) {
        const parsed = new Date(user.expiresAt).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (user.createdAt) {
        const created = new Date(user.createdAt).getTime();
        if (!isNaN(created) && created > 0) {
          return created + (user.ttlHours || 12) * 3600 * 1000;
        }
      }
      try {
        const stored = localStorage.getItem("50points_guest_expires_at");
        if (stored) {
          const parsed = new Date(stored).getTime();
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch (e) {}
      return null;
    };

    const expiryMs = getExpiryMs();
    if (!expiryMs) {
      setTimeLeft("");
      return undefined;
    }

    let expired = false;
    const updateTimer = () => {
      const remaining = expiryMs - Date.now();
      if (remaining <= 0) {
        setTimeLeft("0h 00m");
        if (!expired) {
          expired = true;
          if (typeof onExpire === "function") onExpire();
        }
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);

      setTimeLeft(`${hours}h ${String(minutes).padStart(2, "0")}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user, onExpire]);

  return timeLeft;
}

export default function ModalityTorneoBar({ t, modalityId = "free", className = "", onOpenGuide }) {
  const { user, logout } = useAuth();
  const [showCard, setShowCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);
  const logo = logoFile();
  const guestTimeLeft = useGuestCountdown(user, logout);

  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setShowCard(false);
      }
    }
    if (showCard) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCard]);

  return (
    <div
      className={`mw-torneo-banner mw-torneo-banner--${modalityId}${className ? ` ${className}` : ""}`}
    >
      <div className="mw-torneo-banner__inner">
        <div className="mw-torneo-banner__copy">
          <p className="mw-torneo-banner__title">{t("modalityWorkspace.torneoTitle")}</p>
          <p className="mw-torneo-banner__slogan">
            <span className="mw-torneo-banner__slogan-part mw-torneo-banner__slogan-part--strategy">
              {t("hero.sloganStrategy")}.
            </span>{" "}
            <span className="mw-torneo-banner__slogan-part mw-torneo-banner__slogan-part--points">
              {t("hero.sloganPoints")}.
            </span>{" "}
            <span className="mw-torneo-banner__slogan-part mw-torneo-banner__slogan-part--game">
              {t("hero.sloganGame")}.
            </span>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
            {onOpenGuide && (
              <button
                type="button"
                className="mw-torneo-banner__guide-btn"
                onClick={onOpenGuide}
                style={{ margin: 0 }}
              >
                Cómo Jugar 📖
              </button>
            )}
            {user && (
              <div ref={cardRef} className="mw-torneo-banner__profile" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="mw-profile-pill"
                  onClick={() => setShowCard(!showCard)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.35rem 0.85rem 0.35rem 0.4rem",
                    background: "rgba(255, 255, 255, 0.18)",
                    border: "1.5px solid rgba(255, 255, 255, 0.45)",
                    borderRadius: "9999px",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <span
                    className="mw-profile-pill__avatar"
                    style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      color: "#7c3aed",
                      fontWeight: "900",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                    }}
                  >
                    {user.username.slice(0, 2).toUpperCase()}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1.1" }}>
                    <span className="mw-profile-pill__name" style={{ fontSize: "0.85rem", fontWeight: "900", color: "#ffffff", letterSpacing: "0.02em" }}>
                      {user.username}
                    </span>
                    {user.isGuest && guestTimeLeft && (
                      <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "rgba(255, 255, 255, 0.95)", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.2rem", marginTop: "0.1rem" }}>
                        ⏳ {guestTimeLeft}
                      </span>
                    )}
                  </div>
                  <span
                    className="mw-profile-pill__badge"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      border: "1px solid rgba(255, 255, 255, 0.45)",
                      color: "#ffffff",
                      fontWeight: "900",
                      fontSize: "0.65rem",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "9999px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginLeft: "0.2rem"
                    }}
                  >
                    {user.isGuest ? "Invitado" : "Jugador"}
                  </span>
                </button>

                {showCard && (
                  <div className="mw-profile-card" style={{ left: 0, right: "auto" }}>
                    <div className="mw-profile-card__header">
                      <h5 className="mw-profile-card__title">{user.username}</h5>
                      <span className="mw-profile-card__subtitle">
                        {user.isGuest ? "Perfil Temporal" : "Usuario Registrado"}
                      </span>
                    </div>

                    <div className="mw-profile-card__body">
                      {user.isGuest && (
                        <div style={{ padding: "0.5rem", borderRadius: "0.375rem", backgroundColor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: "800", display: "block" }}>
                            ⏰ SESIÓN TEMPORAL DE 12 HORAS
                          </span>
                          <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)", margin: "0.2rem 0 0", lineHeight: "1.3" }}>
                            Tiempo restante: <strong style={{ color: "#fbbf24" }}>{guestTimeLeft}</strong>. Esta cuenta temporal e historial de tickets se eliminarán automáticamente al expirar.
                          </p>
                        </div>
                      )}
                      {user.isGuest && user.guestToken && (
                        <div className="mw-profile-card__field">
                          <span className="mw-profile-card__label">Clave de Recuperación</span>
                          <div className="mw-profile-card__copy-wrapper">
                            <code className="mw-profile-card__token">{user.guestToken}</code>
                            <button
                              type="button"
                              className="mw-profile-card__copy-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(user.guestToken);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                            >
                              {copied ? "¡Copiado!" : "Copiar"}
                            </button>
                          </div>
                          <p className="mw-profile-card__hint">
                            Usa este código para iniciar sesión o reanudar tu perfil desde cualquier PC.
                          </p>
                        </div>
                      )}

                      {user.country && (
                        <div className="mw-profile-card__field">
                          <span className="mw-profile-card__label">País</span>
                          <span className="mw-profile-card__value">{user.country}</span>
                        </div>
                      )}

                      {user.birthYear && (
                        <div className="mw-profile-card__field">
                          <span className="mw-profile-card__label">Año de Nacimiento</span>
                          <span className="mw-profile-card__value">{user.birthYear}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mw-torneo-banner__emblem">
          <div className="mw-torneo-banner__ticket" aria-hidden />
          {logo ? <img src={logo} alt="" className="mw-torneo-banner__logo" /> : null}
        </div>

        <div className="mw-torneo-banner__flare" aria-hidden />
      </div>
    </div>
  );
}

export function ModalityColorStripes({ className = "", contracted = false }) {
  return (
    <div
      className={`mw-color-stripes${contracted ? " mw-color-stripes--contracted" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-hidden
    >
      <span className="mw-color-stripes__line mw-color-stripes__line--paid" />
      <span className="mw-color-stripes__line mw-color-stripes__line--free" />
      <span className="mw-color-stripes__line mw-color-stripes__line--special" />
      <span className="mw-color-stripes__line mw-color-stripes__line--guest" />
    </div>
  );
}
