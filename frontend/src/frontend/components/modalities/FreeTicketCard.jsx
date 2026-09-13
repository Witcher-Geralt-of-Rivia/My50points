"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { logoFile } from "@/frontend/lib/config/paths";
import {
  ticketStubAsset,
  ticketWorkflowAsset,
} from "@/frontend/lib/config/ticketWorkflowAssets";

export default function FreeTicketCard({
  num,
  used = false,
  playHref,
  onViewTicket,
  onPlay,
  staticStub = false,
  className = "",
}) {
  const { t } = useLanguage();
  const brandLogo = logoFile();
  const stubBg = ticketStubAsset(num, used);
  const barcodeBg = ticketWorkflowAsset("ticketBarcodeStrip");

  const stub = (
    <div
      className="free-ticket-card__stub"
      style={stubBg ? { backgroundImage: `url(${stubBg})` } : undefined}
    >
      <div className="free-ticket-card__perf" aria-hidden />
      <div className="free-ticket-card__main">
        <img src={brandLogo} alt="" className="free-ticket-card__brand" />
        <span className="free-ticket-card__num" aria-hidden>
          {num}
        </span>
        <span
          className={`free-ticket-card__badge${used ? " free-ticket-card__badge--used" : " free-ticket-card__badge--open"}`}
        >
          {used ? (
            <>
              <Check className="free-ticket-card__badge-icon" strokeWidth={3} aria-hidden />
              {t("gameModalities.ticketUsed")}
            </>
          ) : (
            t("gameModalities.ticketAvailable")
          )}
        </span>
      </div>
      <div
        className="free-ticket-card__barcode"
        style={barcodeBg ? { backgroundImage: `url(${barcodeBg})` } : undefined}
        aria-hidden
      />
    </div>
  );

  return (
    <article
      className={`free-ticket-card free-ticket-card--n${num}${used ? " free-ticket-card--used" : " free-ticket-card--available"} ${className}`.trim()}
    >
      {staticStub ? (
        <div className="free-ticket-card__hit free-ticket-card__hit--static">{stub}</div>
      ) : used ? (
        <button
          type="button"
          className="free-ticket-card__hit"
          onClick={onViewTicket}
          aria-label={`${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketGalleryOpen")}`}
        >
          {stub}
        </button>
      ) : (
        <Link
          href={playHref}
          className="free-ticket-card__hit free-ticket-card__hit--link"
          aria-label={`${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketPlayFirst")}`}
        >
          {stub}
        </Link>
      )}

      <div className="free-ticket-card__actions">
        <button
          type="button"
          className="free-ticket-card__view-btn"
          onClick={onViewTicket}
        >
          {t("gameModalities.ticketViewButton")}
        </button>
        {staticStub && !used && onPlay ? (
          <button type="button" className="free-ticket-card__play-btn" onClick={onPlay}>
            {t("gameModalities.ticketGalleryPlayRace")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
