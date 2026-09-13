"use client";

import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

/**
 * Three-paragraph free-tickets copy (blue / free registered modality).
 */
export default function FreeTicketsMessage({ className = "" }) {
  const { t } = useLanguage();

  return (
    <div className={`free-tickets-message${className ? ` ${className}` : ""}`}>
      <div className="free-tickets-message__item">
        <span className="free-tickets-message__marker" aria-hidden />
        <p className="free-tickets-message__text">
          {t("gameModalities.ticketsFreeMessage.lead")}{" "}
          <span className="free-tickets-message__highlight">
            {t("gameModalities.ticketsFreeMessage.highlight")}
          </span>{" "}
          {t("gameModalities.ticketsFreeMessage.leadEnd")}
        </p>
      </div>
      <div className="free-tickets-message__item">
        <span className="free-tickets-message__marker" aria-hidden />
        <p className="free-tickets-message__text">{t("gameModalities.ticketsFreeMessage.p2")}</p>
      </div>
      <div className="free-tickets-message__item">
        <span className="free-tickets-message__marker" aria-hidden />
        <p className="free-tickets-message__text">{t("gameModalities.ticketsFreeMessage.p3")}</p>
      </div>
    </div>
  );
}
