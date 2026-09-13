"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { getTrackImageUrl } from "@/frontend/lib/tournamentImages";
import { getTrackMonogram, useOfficialTrackLogos } from "@/frontend/lib/trackDisplay";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";
import {
  overviewSlotAsset,
  ticketWorkflowAsset,
} from "@/frontend/lib/config/ticketWorkflowAssets";

export default function FreeTicketsOverviewBar({
  tracks,
  usageVersion = 0,
  activeTrackSlug,
  activeTicketNum = null,
  onLogoClick,
  onTicketSlotClick,
  variant = "workflow",
  title,
}) {
  const { t } = useLanguage();
  const showOfficialLogos = useOfficialTrackLogos();

  if (!tracks?.length) return null;

  const tileBg = ticketWorkflowAsset("overviewTrackTileBg");

  const sidebarBg = ticketWorkflowAsset("tracksWorkflowSidebarBg");
  const headerIcon = ticketWorkflowAsset("overviewBarTicketIcon");
  const isBridge = variant === "bridge";
  const displayTitle = title || t("gameModalities.freeTicketsBarTitle");

  return (
    <section
      id="tickets"
      className={`free-tickets-overview free-tickets-overview--workflow${
        isBridge ? " free-tickets-overview--bridge" : ""
      }`}
      aria-label={displayTitle}
      style={sidebarBg ? { "--workflow-sidebar-bg": `url(${sidebarBg})` } : undefined}
      key={usageVersion}
    >
      <header className="free-tickets-overview__head">
        {headerIcon ? (
          <img src={headerIcon} alt="" className="free-tickets-overview__head-icon" aria-hidden />
        ) : null}
        <h2 className="free-tickets-overview__title">{displayTitle}</h2>
      </header>
      <div className="free-tickets-overview__scroll" role="list">
        {tracks.map((track) => {
          const logoSrc = showOfficialLogos ? getTrackImageUrl(track.name, track.imageUrl) : null;
          const monogram = getTrackMonogram(track.name);
          const isActive = activeTrackSlug === track.slug;
          return (
            <div
              key={track.slug}
              role="listitem"
              className={`free-tickets-overview__track${isActive ? " free-tickets-overview__track--active" : ""}`}
            >
              <button
                type="button"
                className="free-tickets-overview__logo-btn"
                onClick={() => onLogoClick?.(track)}
                title={`${track.name} — ${t("gameModalities.enterTournament")}`}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    className="free-tickets-overview__logo"
                    style={tileBg ? { backgroundImage: `url(${tileBg})` } : undefined}
                  />
                ) : (
                  <span
                    className="free-tickets-overview__logo free-tickets-overview__monogram"
                    style={tileBg ? { backgroundImage: `url(${tileBg})` } : undefined}
                  >
                    {monogram}
                  </span>
                )}
              </button>
              <div className="free-tickets-overview__dots">
                {[1, 2, 3].map((num) => {
                  const used = isTrackTicketUsed(track.slug, num);
                  const isActiveSlot = activeTrackSlug === track.slug && activeTicketNum === num;
                  const slotState = used ? "used" : isActiveSlot ? "active" : "open";
                  const slotBg = overviewSlotAsset(slotState);
                  return (
                    <button
                      key={num}
                      type="button"
                      className={`free-tickets-overview__slot${used ? " free-tickets-overview__slot--used" : " free-tickets-overview__slot--open"}${isActiveSlot ? " free-tickets-overview__slot--active" : ""}`}
                      style={slotBg ? { backgroundImage: `url(${slotBg})` } : undefined}
                      onClick={() => onTicketSlotClick?.(track, num)}
                      aria-label={
                        used
                          ? `${track.name} — ${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketGalleryOpen")}`
                          : `${track.name} — ${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketPlayFirst")}`
                      }
                    >
                      {used ? (
                        <Check className="free-tickets-overview__check" strokeWidth={3} aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="free-tickets-overview__track-name" title={track.name}>
                {track.name}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
