"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { acceptModalityWelcome } from "@/frontend/lib/modalityWelcomeStorage";
import ModalityWelcomeCards, {
  ModalityWelcomeHubStripes,
  ModalityWelcomePathStrip,
} from "@/frontend/components/modality-welcome/ModalityWelcomeCards";
import ModalityWelcomeDetail from "@/frontend/components/modality-welcome/ModalityWelcomeDetail";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchJson } from "@/frontend/lib/api/client";
const COLLAPSE_MS = 420;

// Onboarding de invitado: país + año de nacimiento (pedido por el cliente).
const COUNTRIES = [
  "España", "México", "Argentina", "Colombia", "Chile", "Perú", "Venezuela",
  "Estados Unidos", "Ecuador", "Guatemala", "Cuba", "Bolivia", "República Dominicana",
  "Honduras", "Paraguay", "El Salvador", "Nicaragua", "Costa Rica", "Panamá",
  "Uruguay", "Puerto Rico", "Brasil", "Portugal", "Reino Unido", "Francia",
  "Italia", "Alemania", "Canadá", "Otro",
];
const CURRENT_YEAR = new Date().getFullYear();
// Solo mayores de 18: desde (año actual - 18) hacia atrás hasta 100 años.
const BIRTH_YEARS = Array.from({ length: 83 }, (_, i) => CURRENT_YEAR - 18 - i);
const FIELD_STYLE = { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: '#fff', fontWeight: '500', transition: 'border-color 0.2s' };
const FIELD_LABEL_STYLE = { display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' };

export default function ModalityWelcomeModal({ open, modalityId, onAccept }) {
  const { t } = useLanguage();
  const { playAsGuest, resumeGuestWithToken } = useAuth();
  const [closing, setClosing] = useState(false);
  const [alias, setAlias] = useState("");
  const [country, setCountry] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittingGuest, setSubmittingGuest] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [submittingRecovery, setSubmittingRecovery] = useState(false);

  const [recentGuests, setRecentGuests] = useState([]);
  const [selectedRecentGuest, setSelectedRecentGuest] = useState(null);
  const [registeredToken, setRegisteredToken] = useState(null);
  const [registeredAlias, setRegisteredAlias] = useState("");
  const [copiedStatus, setCopiedStatus] = useState(false);

  useEffect(() => {
    if (!open || modalityId !== "guest") return;

    async function loadRecent() {
      let localList = [];
      try {
        const storedStr = localStorage.getItem("50points_recent_guests");
        if (storedStr) {
          localList = JSON.parse(storedStr);
        }
      } catch (e) {
        console.warn("localStorage read failed:", e);
      }

      let ipList = [];
      try {
        const data = await fetchJson("/auth/guest/recent-by-ip");
        if (Array.isArray(data)) {
          ipList = data;
        }
      } catch (e) {
        console.warn("IP guest fetch failed:", e);
      }

      // Merge and deduplicate by username (case-insensitive)
      const merged = [...localList];
      ipList.forEach((ipEntry) => {
        const exists = merged.some(m => m.username.toLowerCase() === ipEntry.username.toLowerCase());
        if (!exists) {
          merged.push(ipEntry);
        }
      });

      setRecentGuests(merged);
    }

    loadRecent();
  }, [open, modalityId]);

  const finishAccept = useCallback(() => {
    acceptModalityWelcome(modalityId);
    onAccept();
  }, [modalityId, onAccept]);

  const handleAccept = useCallback((force = false) => {
    if (closing || !modalityId) return;
    if (modalityId === "guest" && !force) {
      // Guest mode must configure alias; closing the modal cancels and redirects to cover
      window.location.href = "/";
      return;
    }
    setClosing(true);
    window.setTimeout(finishAccept, COLLAPSE_MS);
  }, [closing, modalityId, finishAccept]);

  const handleSubmitGuest = async (e) => {
    if (e) e.preventDefault();
    if (!termsAccepted) {
      setErrorMessage("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    if (alias.trim().length < 3 || alias.trim().length > 20) {
      setErrorMessage("El alias debe tener entre 3 y 20 caracteres.");
      return;
    }
    if (!country) {
      setErrorMessage("Selecciona tu país.");
      return;
    }
    if (!birthYear) {
      setErrorMessage("Selecciona tu año de nacimiento.");
      return;
    }

    setSubmittingGuest(true);
    setErrorMessage("");
    try {
      const data = await playAsGuest(alias.trim(), { country, birthYear: Number(birthYear) });
      try {
        const storedStr = localStorage.getItem("50points_recent_guests");
        const list = storedStr ? JSON.parse(storedStr) : [];
        const filtered = list.filter(item => item.username.toLowerCase() !== alias.trim().toLowerCase());
        filtered.push({ username: alias.trim(), guestToken: data.guestToken });
        localStorage.setItem("50points_recent_guests", JSON.stringify(filtered.slice(-5)));
      } catch (e) {
        console.warn("localStorage write failed:", e);
      }
      setRegisteredAlias(alias.trim());
      setRegisteredToken(data.guestToken);
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

  const handleResumeGuest = async (e) => {
    if (e) e.preventDefault();
    const tokenToUse = recoveryCode.trim();
    if (!tokenToUse) {
      setErrorMessage("Por favor ingresa tu código de recuperación.");
      return;
    }
    setSubmittingGuest(true);
    setErrorMessage("");
    try {
      const u = await resumeGuestWithToken(tokenToUse);
      try {
        const storedStr = localStorage.getItem("50points_recent_guests");
        const list = storedStr ? JSON.parse(storedStr) : [];
        const filtered = list.filter(item => item.username.toLowerCase() !== u.username.toLowerCase());
        filtered.push({ username: u.username, guestToken: tokenToUse });
        localStorage.setItem("50points_recent_guests", JSON.stringify(filtered.slice(-5)));
      } catch (e) {
        console.warn("localStorage write failed:", e);
      }
      handleAccept(true);
    } catch (err) {
      console.error(err);
      setErrorMessage("Código de recuperación inválido o perfil no encontrado.");
    } finally {
      setSubmittingGuest(false);
    }
  };

  useEffect(() => {
    if (open) {
      setClosing(false);
      setAlias("");
      setCountry("");
      setBirthYear("");
      setTermsAccepted(false);
      setErrorMessage("");
      setSelectedRecentGuest(null);
      setRecoveryCode("");
      setShowRecovery(false);
      setRegisteredToken(null);
      setRegisteredAlias("");
      setCopiedStatus(false);
    }
  }, [open, modalityId]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || closing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleAccept();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closing, handleAccept]);

  if (!open || !modalityId) return null;

  return (
    <div
      className={`mw-modal mw-modal--${modalityId}${closing ? " mw-modal--closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mw-modal-title"
    >
      <button
        type="button"
        className="mw-modal__backdrop"
        aria-label={t("modalityWelcome.acceptCta")}
        onClick={handleAccept}
        disabled={closing}
      />
      <div className="mw-modal__panel">
        {registeredToken ? (
          <div className="mw-success-panel" style={{
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            animation: 'mwFadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              border: '2px solid #a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '2rem' }}>🎮</span>
            </div>

            <h2 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '900',
              fontStyle: 'italic',
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textShadow: '0 0 10px rgba(168, 85, 247, 0.5)'
            }}>
              ¡Alias Creado con Éxito!
            </h2>

            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: 'rgba(255, 255, 255, 0.8)',
              maxWidth: '28rem',
              lineHeight: '1.5'
            }}>
              ¡Bienvenido a 50Points! Hemos configurado tu perfil temporal con el alias <strong style={{ color: '#a855f7' }}>{registeredAlias}</strong>.
            </p>

            {/* Token box */}
            <div style={{
              width: '100%',
              maxWidth: '24rem',
              background: '#0a0a0f',
              border: '1px dashed rgba(168, 85, 247, 0.5)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.6)',
              textAlign: 'left'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.65rem',
                fontWeight: '800',
                color: 'rgba(255, 255, 255, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.5rem'
              }}>
                Tu Clave de Recuperación (Cópiala y guárdala):
              </label>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  color: '#c084fc',
                  fontWeight: 'bold',
                  flex: 1,
                  letterSpacing: '0.05em'
                }}>
                  {registeredToken}
                </code>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registeredToken);
                    setCopiedStatus(true);
                    setTimeout(() => setCopiedStatus(false), 3000);
                  }}
                  style={{
                    backgroundColor: copiedStatus ? 'rgba(34, 197, 94, 0.15)' : 'rgba(168, 85, 247, 0.2)',
                    border: copiedStatus ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
                    color: copiedStatus ? '#4ade80' : '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: copiedStatus ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
                  }}
                >
                  {copiedStatus ? "¡Token copiado con éxito! ✓" : "Copiar Token 📋"}
                </button>
              </div>
            </div>

            {/* Warning block */}
            <div style={{
              width: '100%',
              maxWidth: '24rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(244, 63, 94, 0.04)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              textAlign: 'left'
            }}>
              <p style={{
                fontSize: '0.75rem',
                color: '#f43f5e',
                margin: 0,
                fontWeight: '600',
                lineHeight: '1.4'
              }}>
                ⚠️ <strong>Aviso Importante:</strong> Tu cuenta es temporal (Modalidad 4) y caducará en <strong>12 horas</strong>. Al expirar, tu perfil, estadísticas y tickets se eliminarán de forma permanente. Guarda tu token para volver a iniciar sesión dentro de ese plazo, o reclama tus tickets desde una cuenta registrada para conservarlos.
              </p>
            </div>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={() => handleAccept(true)}
              style={{
                width: '100%',
                maxWidth: '24rem',
                padding: '0.85rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                color: '#fff',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
            >
              Comenzar a Jugar 🎮
            </button>
          </div>
        ) : (
          <>
            <header className="mw-modal__head">
              <h2 id="mw-modal-title" className="mw-modal__title">
                {t("gameModalities.hubTitle")}
              </h2>
              <ModalityWelcomeHubStripes />
              <p className="mw-modal__current-label">
                <span className="mw-modal__current-icon" aria-hidden>
                  ▶
                </span>
                {t("modalityWelcome.currentModality")}
              </p>
              <p className="mw-modal__lead">{t("ticketWorkflow.landingLead")}</p>
            </header>

            <div className="mw-modal__body">
              {modalityId !== "guest" && (
                <ModalityWelcomeCards t={t} activeModalityId={modalityId} />
              )}
              
              {modalityId === "guest" ? (
                <div className="mw-modal__guest-form" style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(3,3,5,0.4)', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    {selectedRecentGuest 
                      ? `Reanudar perfil: ${selectedRecentGuest.username}` 
                      : showRecovery 
                      ? "Recuperar Perfil de Invitado" 
                      : "Configura tu perfil de Invitado"}
                  </h4>

                  {selectedRecentGuest ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                        Introduce el código de recuperación de tu alias para acceder a tus tickets y continuar jugando.
                      </p>
                      <div>
                        <label htmlFor="guest-recovery-token" style={FIELD_LABEL_STYLE}>
                          Código de Recuperación (Ej. 50P-XXXXXX)
                        </label>
                        <input
                          id="guest-recovery-token"
                          type="text"
                          value={recoveryCode}
                          onChange={(e) => {
                            setRecoveryCode(e.target.value);
                            setErrorMessage("");
                          }}
                          disabled={closing || submittingRecovery}
                          placeholder="Introduce tu clave..."
                          style={FIELD_STYLE}
                        />
                      </div>
                      
                      {errorMessage && (
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f87171', margin: 0 }}>
                          ⚠️ {errorMessage}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecentGuest(null);
                            setRecoveryCode("");
                            setErrorMessage("");
                          }}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={handleResumeGuest}
                          disabled={submittingRecovery || !recoveryCode.trim()}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#a855f7', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {submittingRecovery ? "Reanudando..." : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  ) : showRecovery ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: '1.4' }}>
                        Si ya jugaste antes, ingresa tu alias y código de recuperación de 6 dígitos para reanudar tu sesión y tus tickets.
                      </p>
                      <div>
                        <label htmlFor="recovery-token-manual" style={FIELD_LABEL_STYLE}>
                          Clave de Recuperación (Ej: 50P-XXXXXX)
                        </label>
                        <input
                          id="recovery-token-manual"
                          type="text"
                          value={recoveryCode}
                          onChange={(e) => {
                            setRecoveryCode(e.target.value);
                            setErrorMessage("");
                          }}
                          disabled={closing || submittingRecovery}
                          placeholder="Introduce tu clave..."
                          style={FIELD_STYLE}
                        />
                      </div>
                      
                      {errorMessage && (
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f87171', margin: 0 }}>
                          ⚠️ {errorMessage}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRecovery(false);
                            setRecoveryCode("");
                            setErrorMessage("");
                          }}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleResumeGuest}
                          disabled={submittingRecovery || !recoveryCode.trim()}
                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#a855f7', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          {submittingRecovery ? "Reanudando..." : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {recentGuests.length > 0 && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                            Últimos alias en este equipo/red:
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {recentGuests.map((g) => (
                              <button
                                key={g.username}
                                type="button"
                                onClick={() => {
                                  setSelectedRecentGuest(g);
                                  setRecoveryCode("");
                                  setErrorMessage("");
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '0.375rem',
                                  border: '1px solid rgba(168,85,247,0.3)',
                                  backgroundColor: 'rgba(168,85,247,0.1)',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                👤 {g.username}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="guest-alias" style={FIELD_LABEL_STYLE}>
                          Elige tu alias
                        </label>
                        <input
                          id="guest-alias"
                          type="text"
                          value={alias}
                          onChange={(e) => { setAlias(e.target.value); setErrorMessage(""); }}
                          disabled={closing || submittingGuest}
                          placeholder="Ej. HorseKing, SpeedRunner..."
                          maxLength={20}
                          style={FIELD_STYLE}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                          <label htmlFor="guest-country" style={FIELD_LABEL_STYLE}>
                            País
                          </label>
                          <select
                            id="guest-country"
                            value={country}
                            onChange={(e) => { setCountry(e.target.value); setErrorMessage(""); }}
                            disabled={closing || submittingGuest}
                            style={FIELD_STYLE}
                          >
                            <option value="">Selecciona tu país</option>
                            {COUNTRIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: 1 }}>
                          <label htmlFor="guest-birthyear" style={FIELD_LABEL_STYLE}>
                            Año de nacimiento
                          </label>
                          <select
                            id="guest-birthyear"
                            value={birthYear}
                            onChange={(e) => { setBirthYear(e.target.value); setErrorMessage(""); }}
                            disabled={closing || submittingGuest}
                            style={FIELD_STYLE}
                          >
                            <option value="">Selecciona el año</option>
                            {BIRTH_YEARS.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => {
                            setTermsAccepted(e.target.checked);
                            setErrorMessage("");
                          }}
                          disabled={closing || submittingGuest}
                          style={{ marginTop: '0.125rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#a855f7' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', fontWeight: '500' }}>
                          Acepto los términos y condiciones de juego y confirmo que soy mayor de edad.
                        </span>
                      </label>
                      
                      {errorMessage && (
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f87171', margin: 0 }}>
                          ⚠️ {errorMessage}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowRecovery(true);
                          setErrorMessage("");
                        }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left', alignSelf: 'flex-start' }}
                      >
                        ¿Ya jugaste antes? Reanudar sesión con tu código de recuperación
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ModalityWelcomeDetail t={t} modalityId={modalityId} />
              )}
            </div>

            <footer className="mw-modal__footer">
              {modalityId === "guest" && (showRecovery || selectedRecentGuest || registeredToken) ? null : (
                <button
                  type="button"
                  className={`mw-modal__accept mw-modal__accept--${modalityId}`}
                  onClick={modalityId === "guest" ? handleSubmitGuest : handleAccept}
                  disabled={closing || submittingGuest || (modalityId === "guest" && (!termsAccepted || alias.trim().length < 3 || !country || !birthYear))}
                >
                  <CheckCircle2 className="mw-modal__accept-icon" strokeWidth={2.25} aria-hidden />
                  <span>
                    {submittingGuest 
                      ? "Guardando..." 
                      : modalityId === "guest" 
                      ? "Jugar como Invitado" 
                      : t("modalityWelcome.acceptCta")}
                  </span>
                </button>
              )}
              <p className="mw-modal__hint">
                {t("modalityWelcome.menuHint")}{" "}
                <Link href="/guia-torneo" className="mw-modal__hint-link">
                  {t("floatingMenu.tournamentGuide")}
                </Link>
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
