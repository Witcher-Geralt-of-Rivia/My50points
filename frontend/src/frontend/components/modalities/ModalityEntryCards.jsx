"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HUB_DISPLAY_ORDER,
  markCoverPassed,
  persistModality,
  getModality,
} from "@/frontend/lib/gameModalities";
import { useAuth } from "@/frontend/contexts/AuthContext";

function onModalityNav(modalityId) {
  persistModality(modalityId);
  markCoverPassed();
}

export default function ModalityEntryCards({ t, className = "", onTriggerAcceptNotice }) {
  const [isAccepted, setIsAccepted] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const isRealUser = Boolean(isAuthenticated && user && !user.isGuest);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAccepted(sessionStorage.getItem("modality_4_accepted") === "true");
    }
  }, []);

  return (
    <div className={`modality-entry-cards${className ? ` ${className}` : ""}`}>
      {HUB_DISPLAY_ORDER.map((modeId, index) => {
        const isGuest = modeId === "guest";
        const modalityNum = t(`gameModalities.${modeId}.hubModalityNum`) || `MODALIDAD ${index + 1}`;
        const modInfo = getModality(modeId);
        const isAvailable = modInfo.available;

        return (
          <div
            key={modeId}
            className={`modality-entry-card-wrap modality-entry-card-wrap--${modeId}${!isAvailable ? " modality-entry-card-wrap--locked" : ""}`}
          >
            {/* Animated border glow wrapper */}
            <div className={`modality-entry-card-glow-wrap modality-entry-card-glow-wrap--${modeId}`}>
              <div className={`modality-entry-card modality-entry-card--${modeId}`}>
                <h3 className="modality-entry-card__title">
                  {t(`gameModalities.${modeId}.hubTournament`)}
                </h3>
                <p className="modality-entry-card__mode">{modalityNum}</p>
                
                {!isAvailable ? (
                  <div className="modality-entry-card__locked" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0', opacity: 0.5 }}>
                    <span style={{ fontSize: '1.25rem' }}>🔒</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Próximamente</span>
                  </div>
                ) : isGuest ? (
                  <Link
                    href="/modalidades/guest"
                    className={`modality-entry-card__btn modality-entry-card__btn--${modeId}`}
                    onClick={() => {
                      sessionStorage.setItem("modality_4_accepted", "true");
                      onModalityNav(modeId);
                    }}
                  >
                    {t("gameModalities.hubGuestCta")}
                  </Link>
                ) : isRealUser ? (
                  <Link
                    href={`/modalidades/${modeId}`}
                    className={`modality-entry-card__btn modality-entry-card__btn--${modeId} shadow-lg`}
                    onClick={() => onModalityNav(modeId)}
                  >
                    ENTRAR A {modalityNum}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2 w-full mt-auto">
                    <Link
                      href={`/login?modality=${modeId}`}
                      className={`modality-entry-card__btn modality-entry-card__btn--${modeId}`}
                      onClick={() => onModalityNav(modeId)}
                    >
                      {t("gameModalities.hubLoginCta")}
                    </Link>
                    <Link
                      href={`/register?modality=${modeId}`}
                      className={`modality-entry-card__register modality-entry-card__register--${modeId}`}
                      style={{ margin: 0, textDecoration: 'underline' }}
                      onClick={() => onModalityNav(modeId)}
                    >
                      {t("gameModalities.hubRegisterCta")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
