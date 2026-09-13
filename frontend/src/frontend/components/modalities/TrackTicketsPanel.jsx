"use client";

import { Gift } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getModality } from "@/frontend/lib/gameModalities";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";
import { BrowserTabs, BrowserTabBar, BrowserTab } from "@/frontend/components/ui/BrowserTabBar";
import FreeTicketCard from "@/frontend/components/modalities/FreeTicketCard";

const TICKET_NUMS = [1, 2, 3];

export default function TrackTicketsPanel({
  modalityId,
  trackSlug,
  tournamentSlug,
  usageVersion = 0,
  activeNum = 1,
  onActiveNumChange,
  onPlayTicket,
  inline = false,
  onOpenRaces,
}) {
  const { t } = useLanguage();
  const mod = getModality(modalityId);

  return (
    <div
      className={`track-tickets-panel${inline ? " track-tickets-panel--inline" : ""}`}
      style={{ "--modality-accent": mod.accent }}
      key={`${usageVersion}-${trackSlug}`}
    >
      {!inline ? (
        <div className="track-tickets-panel__banner">
          <Gift className="track-tickets-panel__banner-icon" aria-hidden />
          <p className="track-tickets-panel__banner-title">
            {t("gameModalities.freeTicketsBanner")}
          </p>
          <p className="track-tickets-panel__banner-sub">{t("gameModalities.freeTicketsBannerSub")}</p>
        </div>
      ) : null}

      <BrowserTabs className="browser-tabs--tickets">
        <BrowserTabBar role="tablist" aria-label={t("gameModalities.yourTickets")}>
          {TICKET_NUMS.map((num) => {
            const used = isTrackTicketUsed(trackSlug, num);
            const isActive = activeNum > 0 && activeNum === num;
            let statusLabel = t("gameModalities.ticketAvailable");
            if (used) statusLabel = t("gameModalities.ticketUsed");
            else if (isActive) statusLabel = t("gameModalities.ticketReady");

            return (
              <BrowserTab
                key={num}
                id={`track-ticket-tab-${trackSlug}-${num}`}
                aria-controls={`track-ticket-panel-${trackSlug}-${num}`}
                active={isActive}
                used={used}
                className={`track-tickets-tab track-tickets-tab--n${num}${
                  used ? " track-tickets-tab--used" : ""
                }${isActive ? " track-tickets-tab--active" : ""} tour-step-ticket-tab`}
                onClick={() => onActiveNumChange?.(num)}
              >
                <span className="track-tickets-tab__label">
                  {t("gameModalities.ticketLabel")} {num}
                </span>
                <span className="track-tickets-tab__status">{statusLabel}</span>
              </BrowserTab>
            );
          })}
        </BrowserTabBar>
      </BrowserTabs>

      {inline ? (
        <div className="mt-4 flex justify-center">
          <FreeTicketCard
            num={activeNum}
            used={isTrackTicketUsed(trackSlug, activeNum)}
            playHref=""
            staticStub={true}
            onPlay={() => onPlayTicket?.(activeNum)}
            onViewTicket={() => onPlayTicket?.(activeNum)}
          />
        </div>
      ) : null}
    </div>
  );
}
