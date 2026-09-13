"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { dismissTournamentGuide } from "@/frontend/lib/tournamentGuideStorage";
import { useAuth } from "@/frontend/contexts/AuthContext";
import TournamentGuideSteps, {
  TournamentGuideHeroArt,
  TournamentGuidePath,
} from "@/frontend/components/tournament-guide/TournamentGuideSteps";
import TournamentGuideQuickSummary from "@/frontend/components/tournament-guide/TournamentGuideQuickSummary";
import { logoFile } from "@/frontend/lib/config/paths";

export default function TournamentGuideModal({ open, onClose, modalityId = null, hideGuestForm = false }) {
  const { t } = useLanguage();
  const { playAsGuest } = useAuth();
  const [dontShow, setDontShow] = useState(false);
  const isGuestMode = modalityId === "guest" && !hideGuestForm;

  // Guest registration states
  const [alias, setAlias] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittingGuest, setSubmittingGuest] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (modalityId === "guest") {
          onClose({ dontShowAgain: dontShow, begin: false, guestSuccess: false });
        } else {
          onClose({ dontShowAgain: dontShow });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, dontShow, modalityId]);

  const handleClose = useCallback(
    (begin = false) => {
      if (dontShow) dismissTournamentGuide();
      onClose({ dontShowAgain: dontShow, begin });
    },
    [dontShow, onClose],
  );

  const handleSubmitGuest = async () => {
    if (!termsAccepted) {
      setErrorMessage("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    if (alias.trim().length < 3 || alias.trim().length > 20) {
      setErrorMessage("El alias debe tener entre 3 y 20 caracteres.");
      return;
    }

    setSubmittingGuest(true);
    setErrorMessage("");
    try {
      await playAsGuest(alias.trim());
      if (dontShow) dismissTournamentGuide();
      onClose({ dontShowAgain: dontShow, begin: true, guestSuccess: true });
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes("409")) {
        setErrorMessage("Este alias ya está tomado. Por favor elige otro.");
      } else {
        setErrorMessage("Error al crear sesión de invitado. Inténtalo de nuevo.");
      }
    } finally {
      setSubmittingGuest(false);
    }
  };

  if (!open) return null;

  return (
    <div className={`tg-modal tg-modal--${modalityId || 'paid'}`} role="dialog" aria-modal="true" aria-labelledby="tg-modal-title">
      <button
        type="button"
        className="tg-modal__backdrop"
        aria-label={t("tournamentGuide.closeCta")}
        onClick={() => handleClose(false)}
      />
      <div className="tg-modal__panel">
        <header className="tg-modal__header">
          {/* Centered Torneo Logo Box */}
          <div className="w-full flex justify-center mb-2">
            <div className="app-splash__stack" style={{ border: '1.5px solid #ffffff', padding: '0.45rem 1.15rem', width: '342px', maxWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              <div className="app-splash__head" style={{ gap: '0.9rem' }}>
                <h1 className="app-splash__title" style={{ fontSize: '1.8rem' }}>{t("hero.tournament")}</h1>
                <div className="app-splash__logo-wrap" style={{ height: '1.8rem' }}>
                  <img src={logoFile()} alt="50points" className="app-splash__logo" style={{ height: '1.8rem' }} />
                </div>
              </div>
              <p className="app-splash__slogan" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                <span className="app-splash__slogan-part app-splash__slogan-part--gold">{t("hero.sloganStrategy")}.</span>
                <span className="app-splash__slogan-part app-splash__slogan-part--purple">{t("hero.sloganPoints")}.</span>
                <span className="app-splash__slogan-part app-splash__slogan-part--cyan">{t("hero.sloganGame")}.</span>
              </p>
              <div className="app-splash__loader" style={{ height: '2px', marginTop: '0.2rem' }}>
                <div className="app-splash__loader-track" style={{ height: '2px' }}>
                  <div className="app-splash__loader-fill" style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center w-full mt-2">
            <h2 id="tg-modal-title" className="tg-modal__title text-center text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-2">
              {t("tournamentGuide.modalTitle")}
            </h2>
            
            {/* Styled color step flow path */}
            <p className="tg-modal__path font-black text-center tracking-wide text-[11px] sm:text-xs uppercase mb-2">
              <span className="text-[#a855f7]">Modalidad</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-[#22d3ee]">Hipódromo</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-white">Ticket</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-[#fbbf24]">Estrategias</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-[#2dd4bf]">Confirmación</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-[#a855f7]">Torneo</span> <span className="text-zinc-500">→</span>{" "}
              <span className="text-white">Ranking</span>
            </p>
            
            <p className="tg-modal__lead text-zinc-400 text-xs text-center max-w-2xl mx-auto leading-relaxed">
              {t("tournamentGuide.modalLead")}
            </p>
          </div>
        </header>        <div className="tg-modal__body">
          <div className="tg-modal__steps-zone" style={isGuestMode ? { paddingBottom: '1rem' } : undefined}>
            <TournamentGuideSteps t={t} compact />
          </div>

          {isGuestMode ? (
            <div className="tg-guest-entry-container" style={{
              marginTop: '1.25rem',
              padding: '1.5rem 2rem',
              borderRadius: '1rem',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              background: 'linear-gradient(135deg, rgba(20, 10, 35, 0.8) 0%, rgba(5, 5, 8, 0.95) 100%)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(168, 85, 247, 0.15), inset 0 0 15px rgba(168, 85, 247, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              textAlign: 'center',
              alignItems: 'center',
              width: '100%',
              maxWidth: '640px',
              marginInline: 'auto'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '900',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                background: 'linear-gradient(90deg, #22d3ee 30%, #c084fc 70%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✨ CONFIGURAR ALIAS DE INVITADO
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', margin: 0, maxWidth: '520px', lineHeight: '1.45' }}>
                Elige el alias que te identificará públicamente en el Leaderboard y Ranking global.
              </p>

              {errorMessage && (
                <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#f87171', margin: 0 }}>
                  ⚠️ {errorMessage}
                </p>
              )}

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '0.4rem'
              }}>
                {/* Input with inline user icon */}
                <div style={{ position: 'relative', width: '250px' }}>
                  <span style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(168, 85, 247, 0.8)',
                    fontSize: '1rem',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    👤
                  </span>
                  <input
                    id="guest-alias"
                    type="text"
                    value={alias}
                    onChange={(e) => {
                      setAlias(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="Escribe tu alias..."
                    maxLength={20}
                    disabled={submittingGuest}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '2px solid rgba(168, 85, 247, 0.45)',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 1rem 0.65rem 2.25rem',
                      fontSize: '0.95rem',
                      color: '#fff',
                      outline: 'none',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(168, 85, 247, 0.1)',
                      width: '100%',
                      transition: 'all 0.25s ease',
                      textAlign: 'left'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#22d3ee';
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(34, 211, 238, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(168, 85, 247, 0.45)';
                      e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(168, 85, 247, 0.1)';
                    }}
                  />
                </div>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.6rem', 
                  cursor: 'pointer', 
                  userSelect: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                >
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setErrorMessage("");
                    }}
                    disabled={submittingGuest}
                    style={{
                      borderRadius: '0.25rem',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      width: '16px',
                      height: '16px',
                      accentColor: '#a855f7',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)', fontWeight: '500' }}>
                    Acepto los términos y condiciones.
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="tg-modal__scroll-zone">
              <TournamentGuideQuickSummary t={t} />
            </div>
          )}
        </div>

        <footer className="tg-modal__footer" style={{ borderTop: isGuestMode ? 'none' : undefined }}>
          {!isGuestMode && (
            <label className="tg-modal__dismiss">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(event) => setDontShow(event.target.checked)}
              />
              <span className="tg-modal__dismiss-copy">
                <strong>{t("tournamentGuide.dontShowAgain")}</strong>
                <span>{t("tournamentGuide.dontShowHint")}</span>
              </span>
            </label>
          )}

          <div className="tg-modal__actions" style={isGuestMode ? { marginInline: 'auto', gap: '1.5rem' } : undefined}>
            <button
              type="button"
              className="tg-modal__btn tg-modal__btn--primary"
              onClick={isGuestMode ? handleSubmitGuest : () => handleClose(true)}
              disabled={submittingGuest || (isGuestMode && (!termsAccepted || alias.trim().length < 3))}
              style={isGuestMode ? { minWidth: '180px', paddingBlock: '0.75rem' } : undefined}
            >
              <Play className="tg-modal__btn-icon" strokeWidth={2.5} aria-hidden />
              <span className="tg-modal__btn-text">
                {submittingGuest 
                  ? "Guardando..." 
                  : isGuestMode 
                  ? "Jugar como Invitado" 
                  : t("tournamentGuide.beginCta")}
              </span>
            </button>
            <button
              type="button"
              className="tg-modal__btn tg-modal__btn--secondary"
              onClick={() => handleClose(false)}
              disabled={submittingGuest}
              style={isGuestMode ? { minWidth: '130px', paddingBlock: '0.75rem' } : undefined}
            >
              <X className="tg-modal__btn-icon" strokeWidth={2.5} aria-hidden />
              <span className="tg-modal__btn-text">
                {isGuestMode ? "Cancelar" : t("tournamentGuide.closeCta")}
              </span>
            </button>
          </div>

          {!isGuestMode && <p className="tg-modal__menu-hint">{t("tournamentGuide.menuHint")}</p>}
        </footer>
      </div>
    </div>
  );
}
