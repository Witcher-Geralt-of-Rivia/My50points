"use client";

/**
 * Ticket unlock (rewarded ad) — M2 aqua metal sheet / M4 pearl sheet.
 *
 * Entitlement is the backend's (unchanged):
 *   Ticket 1 is always free.
 *   M2 (registered): ONE completed ad per tournament unlocks Tickets 2 AND 3.
 *   M4 (guest): each extra ticket needs its own completed ad.
 * Proof-of-watch handshake: GET /tickets/ad-challenge when the sheet opens,
 * then POST /tickets/ad-unlock with that token after the full view. The
 * tickets actually granted are read from the response (`unlockedTickets`).
 */
import { useCallback, useEffect, useState } from "react";
import { Lock, Unlock, Play, RotateCcw, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Dialog } from "@/frontend/components/ui";
import { fetchAuthJson } from "@/frontend/lib/api/client";
import useRewardedAd, { AD_DURATION_SECONDS } from "@/frontend/lib/hooks/useRewardedAd";
import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import GuideRing from "@/frontend/components/ui/GuideRing";

export default function TicketUnlockModal({ ticketNumber, tournamentId, tournamentName, isGuest = false, onClose, onUnlocked }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [challenge, setChallenge] = useState(null);
  const [prep, setPrep] = useState("loading"); // loading | ready | error
  const [phase, setPhase] = useState("idle"); // idle | saving | done | error
  const [granted, setGranted] = useState([]);
  const [message, setMessage] = useState("");

  const loadChallenge = useCallback(() => {
    let live = true;
    setPrep("loading");
    fetchAuthJson(`/tickets/ad-challenge?tournamentId=${tournamentId}&ticketNumber=${ticketNumber}`)
      .then((d) => {
        if (!live) return;
        if (d?.adToken) { setChallenge(d.adToken); setPrep("ready"); } else setPrep("error");
      })
      .catch(() => { if (live) setPrep("error"); });
    return () => { live = false; };
  }, [tournamentId, ticketNumber]);

  useEffect(() => loadChallenge(), [loadChallenge]);

  const unlock = async () => {
    if (!challenge) return;
    setPhase("saving");
    setMessage("");
    try {
      const res = await fetchAuthJson("/tickets/ad-unlock", {
        method: "POST",
        body: JSON.stringify({ tournamentId, ticketNumber, adToken: challenge }),
      });
      const list = Array.isArray(res?.unlockedTickets) && res.unlockedTickets.length ? res.unlockedTickets : [ticketNumber];
      setGranted(list);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setMessage(
        err?.status === 401
          ? isEn ? "Your session expired. Sign in again to unlock." : "Tu sesión expiró. Vuelve a entrar para desbloquear."
          : isEn ? "The full ad view could not be verified. The ticket stays locked — try again." : "No se pudo verificar el anuncio completo. El boleto sigue bloqueado: inténtalo de nuevo.",
      );
    }
  };

  const ad = useRewardedAd({ onComplete: () => unlock(), onFail: () => {} });

  const retry = () => {
    ad.reset();
    setPhase("idle");
    setMessage("");
    loadChallenge();
  };

  const finish = () => {
    if (phase === "done") onUnlocked?.(granted);
    else onClose?.();
  };

  const rule = isGuest
    ? isEn
      ? `As a guest, each extra ticket unlocks with its own ad. This ad unlocks ticket ${ticketNumber} only.`
      : `Como invitado, cada boleto extra se desbloquea con su propio anuncio. Este anuncio desbloquea solo el boleto ${ticketNumber}.`
    : isEn
      ? "Ticket 1 is free. One complete ad unlocks tickets 2 and 3 for this tournament."
      : "El boleto 1 es gratis. Un anuncio completo desbloquea los boletos 2 y 3 de este torneo.";

  const grantedText = granted.length > 1
    ? isEn ? `Tickets ${granted.join(" and ")} unlocked` : `Boletos ${granted.join(" y ")} desbloqueados`
    : isEn ? `Ticket ${granted[0] ?? ticketNumber} unlocked` : `Boleto ${granted[0] ?? ticketNumber} desbloqueado`;

  const creative = profileHubAsset("adBannerStadium");
  const showing = ad.phase === "showing";
  const progress = Math.round(((AD_DURATION_SECONDS - ad.secondsLeft) / AD_DURATION_SECONDS) * 100);

  return (
    <Dialog
      open
      onClose={finish}
      accent={isGuest ? "m4" : "m2"}
      material={isGuest ? "pearl" : "metal"}
      className={`unl ${isGuest ? "unl--m4" : "unl--m2"}`}
      eyebrow={isGuest ? (isEn ? "Mode 4 · Guest" : "Modalidad 4 · Invitado") : isEn ? "Mode 2 · Registered" : "Modalidad 2 · Registrado"}
      title={phase === "done" ? grantedText : isEn ? `Unlock ticket ${ticketNumber}` : `Desbloquear boleto ${ticketNumber}`}
    >
      <div className="unl__ticket" data-state={phase === "done" ? "open" : "locked"}>
        <span className="unl__ticketicon">{phase === "done" ? <Unlock size={22} aria-hidden /> : <Lock size={22} aria-hidden />}</span>
        <span className="unl__ticketlabel t-label">{isEn ? "Ticket" : "Boleto"}</span>
        <span className="unl__ticketnum t-data">{ticketNumber}</span>
        {tournamentName ? <span className="unl__tournament">{tournamentName}</span> : null}
      </div>

      <p className="unl__rule">{rule}</p>

      {phase === "done" ? (
        <div className="unl__result unl__result--ok" role="status">
          <CheckCircle2 size={22} aria-hidden />
          <span>{grantedText}. {isEn ? "Build it like ticket 1 — it competes on its own." : "Constrúyelo como el boleto 1: compite por separado."}</span>
        </div>
      ) : (
        <div className="unl__ad" data-phase={showing ? "showing" : ad.phase}>
          <div className="unl__media">
            {creative ? <img src={creative} alt="" aria-hidden className="unl__creative" /> : null}
            <span className="unl__tag">{isEn ? "Sponsored ad" : "Anuncio patrocinado"}</span>
            {showing ? (
              <button type="button" className="ui-iconbtn unl__skip" onClick={ad.closeEarly} aria-label={isEn ? "Close ad (ticket stays locked)" : "Cerrar anuncio (el boleto sigue bloqueado)"}>
                <X size={18} aria-hidden />
              </button>
            ) : null}
          </div>
          {showing ? (
            <div className="unl__progress" role="status" aria-live="polite">
              <span className="unl__bar"><span className="unl__fill" style={{ width: `${progress}%` }} /></span>
              <span className="t-meta">{isEn ? `${ad.secondsLeft} s left` : `Quedan ${ad.secondsLeft} s`}</span>
            </div>
          ) : null}
          {ad.phase === "failed" ? (
            <p className="unl__result unl__result--warn" role="alert">
              <AlertTriangle size={18} aria-hidden />
              {isEn ? "The ad was closed before the end. The ticket stays locked." : "El anuncio se cerró antes de terminar. El boleto sigue bloqueado."}
            </p>
          ) : null}
          {phase === "error" || prep === "error" ? (
            <p className="unl__result unl__result--warn" role="alert">
              <AlertTriangle size={18} aria-hidden />
              {phase === "error" ? message : isEn ? "The ad could not be prepared. Try again." : "No se pudo preparar el anuncio. Inténtalo de nuevo."}
            </p>
          ) : null}
        </div>
      )}

      <div className="unl__actions">
        {phase === "done" ? (
          <button type="button" className={`ui-btn ${isGuest ? "ui-btn--primary" : "ui-btn--aqua"} ui-btn--lg ui-btn--block`} onClick={finish} data-autofocus>
            {isEn ? `Play ticket ${granted.includes(ticketNumber) ? ticketNumber : granted[0]}` : `Jugar boleto ${granted.includes(ticketNumber) ? ticketNumber : granted[0]}`}
            <GuideRing />
          </button>
        ) : phase === "saving" ? (
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--lg ui-btn--block" disabled aria-busy="true">
            <span className="ui-spin" aria-hidden />{isEn ? "Unlocking…" : "Desbloqueando…"}
          </button>
        ) : phase === "error" || prep === "error" || ad.phase === "failed" ? (
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--lg ui-btn--block" onClick={retry}>
            <RotateCcw size={18} aria-hidden />{isEn ? "Try again" : "Reintentar"}
          </button>
        ) : (
          <button
            type="button"
            className={`ui-btn ${isGuest ? "ui-btn--primary" : "ui-btn--aqua"} ui-btn--lg ui-btn--block unl__watch`}
            onClick={ad.start}
            disabled={prep !== "ready" || showing}
            data-autofocus
          >
            {prep === "loading" ? <span className="ui-spin" aria-hidden /> : <Play size={18} aria-hidden />}
            {prep === "loading"
              ? isEn ? "Preparing ad…" : "Preparando anuncio…"
              : showing
                ? isEn ? "Watching…" : "Viendo anuncio…"
                : isEn ? `Watch ad (${AD_DURATION_SECONDS} s)` : `Ver anuncio (${AD_DURATION_SECONDS} s)`}
            {prep === "ready" && !showing ? <GuideRing /> : null}
          </button>
        )}
        {phase !== "done" ? (
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--block unl__cancel" onClick={onClose} disabled={phase === "saving"}>
            {isEn ? "Not now" : "Ahora no"}
          </button>
        ) : null}
      </div>
    </Dialog>
  );
}
