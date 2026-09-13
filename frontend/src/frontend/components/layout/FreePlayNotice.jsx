"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, X } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import FreeTicketsMessage from "@/frontend/components/modalities/FreeTicketsMessage";

const DISMISS_KEY = "50points_free_play_notice_dismissed";

/** gameMode 1 = guest; 2 = registered free (cyan); 3+ = paid tiers (not launched). */
function noticeVariant(user) {
  if (!user) return null;
  if (user.gameMode === 1 || user.isGuest) return "guest";
  if (user.gameMode === 2) return "registered";
  return "paidLocked";
}

export default function FreePlayNotice() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    setHydrated(true);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const variant = noticeVariant(user);
  if (!hydrated || !isAuthenticated || !user || !variant || dismissed) return null;

  const isRegisteredFree = variant === "registered";
  const isGuest = variant === "guest";

  return (
    <div
      className={`free-play-notice${
        isRegisteredFree ? " free-play-notice--registered" : isGuest ? " free-play-notice--guest" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="free-play-notice__icon-wrap" aria-hidden>
        <Ticket className="free-play-notice__icon" />
        <span className="free-play-notice__ticket-count">3</span>
      </div>
      <div className="free-play-notice__text">
        {isRegisteredFree ? (
          <FreeTicketsMessage className="free-tickets-message--compact" />
        ) : (
          <>
            <p className="free-play-notice__title">{t("freePlay.titleFree")}</p>
            <p className="free-play-notice__body">{t("freePlay.bodyFree")}</p>
          </>
        )}
        {!isRegisteredFree ? (
          <Link href="/modalidades/free" className="free-play-notice__cta">
            {t("freePlay.ctaPlay")}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        className="free-play-notice__dismiss"
        onClick={dismiss}
        aria-label={t("freePlay.dismiss")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
