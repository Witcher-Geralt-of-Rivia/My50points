"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { HUB_DISPLAY_ORDER } from "@/frontend/lib/gameModalities";
import { acceptModalityWelcome } from "@/frontend/lib/modalityWelcomeStorage";
import ModalityWelcomeCards, {
  ModalityWelcomePathStrip,
} from "@/frontend/components/modality-welcome/ModalityWelcomeCards";
import ModalityWelcomeDetail from "@/frontend/components/modality-welcome/ModalityWelcomeDetail";

/**
 * Full inline modality gate (mockup layout). Collapses on accept → summary bar.
 */
export default function ModalityWelcomeExpanded({ modalityId, onAccepted }) {
  const { t } = useLanguage();
  const [collapsing, setCollapsing] = useState(false);

  const handleAccept = useCallback(() => {
    if (collapsing) return;
    setCollapsing(true);
    window.setTimeout(() => {
      acceptModalityWelcome(modalityId);
      onAccepted?.();
    }, 480);
  }, [collapsing, modalityId, onAccepted]);

  return (
    <section
      className={`mw-welcome-expanded mw-welcome-expanded--${modalityId}${
        collapsing ? " mw-welcome-expanded--collapsing" : ""
      }`}
      aria-labelledby={`mw-welcome-expanded-title-${modalityId}`}
    >
      <div className="mw-welcome-expanded__panel">
        <ModalityWelcomePathStrip t={t} />

        <header className="mw-welcome-expanded__head">
          <div className="mw-welcome-expanded__stripes" aria-hidden>
            {HUB_DISPLAY_ORDER.map((id) => (
              <span key={id} className={`mw-modal__stripe mw-modal__stripe--${id}`} />
            ))}
          </div>
          <h2 id={`mw-welcome-expanded-title-${modalityId}`} className="mw-modal__title">
            {t("gameModalities.hubTitle")}
          </h2>
          <p className="mw-modal__current-label">
            <span className="mw-modal__current-icon" aria-hidden>
              ▶
            </span>
            {t("modalityWelcome.currentModality")}
          </p>
          <p className="mw-modal__lead">{t("ticketWorkflow.landingLead")}</p>
        </header>

        <div className="mw-welcome-expanded__body">
          <ModalityWelcomeCards t={t} activeModalityId={modalityId} />
          <ModalityWelcomeDetail t={t} modalityId={modalityId} />
        </div>

        <footer className="mw-welcome-expanded__footer">
          <button
            type="button"
            className={`mw-modal__accept mw-modal__accept--${modalityId}`}
            onClick={handleAccept}
            disabled={collapsing}
          >
            <CheckCircle2 className="mw-modal__accept-icon" strokeWidth={2.25} aria-hidden />
            <span>{t("modalityWelcome.acceptCta")}</span>
          </button>
          <p className="mw-modal__hint">
            {t("modalityWelcome.menuHint")}{" "}
            <Link href="/guia-torneo" className="mw-modal__hint-link">
              {t("floatingMenu.tournamentGuide")}
            </Link>
          </p>
        </footer>
      </div>
    </section>
  );
}
