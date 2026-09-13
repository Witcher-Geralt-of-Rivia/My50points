"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { buildTournamentEntryHref } from "@/frontend/lib/gameModalities";
import { ticketWorkflowAsset } from "@/frontend/lib/config/ticketWorkflowAssets";
import { getTrackImageUrl } from "@/frontend/lib/tournamentImages";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";

const TICKET_NUMS = [1, 2, 3];

export default function FreeTicketsOverviewBar({
  modalityId,
  tracks = [],
  loading = false,
  activeTrackSlug = null,
  activeTicketNum = null,
  usageVersion = 0,
  onSelectTrack,
  onSelectTicket,
  titleKey = "gameModalities.freeTicketsBarTitle",
  inProfileShell = false,
}) {
  const { t } = useLanguage();
  const [tick, setTick] = useState(usageVersion);
  const headIcon = ticketWorkflowAsset("overviewBarTicketIcon");

  useEffect(() => {
    setTick(usageVersion);
  }, [usageVersion]);

  useEffect(() => {
    const refresh = () => setTick((v) => v + 1);
    window.addEventListener("50points-tickets-updated", refresh);
    return () => window.removeEventListener("50points-tickets-updated", refresh);
  }, []);

  if (loading) {
    return (
      <div className="tracks-workflow-tickets-bridge">
        <p className="tracks-workflow__status">{t("gameModalities.loading")}</p>
      </div>
    );
  }

  if (tracks.length === 0) return null;

  void tick;

  return (
    <section
      id="tickets"
      className={`tracks-workflow-tickets-bridge free-tickets-overview free-tickets-overview--bridge free-tickets-overview--${modalityId}${
        inProfileShell ? " free-tickets-overview--profile-shell" : ""
      }`}
      aria-label={t(titleKey)}
    >
      <div className="free-tickets-overview__head">
        {headIcon ? (
          <img src={headIcon} alt="" className="free-tickets-overview__head-icon" aria-hidden />
        ) : null}
        <h3 className="free-tickets-overview__title">{t(titleKey)}</h3>
      </div>

      <div className="free-tickets-overview__scroll">
        {tracks.map((track) => {
          const logoUrl =
            track.imageUrl || getTrackImageUrl(track.name, track.imageUrl) || null;
          const isActive = track.slug === activeTrackSlug;
          const tournamentHref = track.tournamentSlug
            ? buildTournamentEntryHref({
                tournamentSlug: track.tournamentSlug,
                modalityId,
                trackSlug: track.slug,
              })
            : null;

          return (
            <div
              key={track.slug}
              className={`free-tickets-overview__track${
                isActive ? " free-tickets-overview__track--active" : ""
              }`}
            >
              {tournamentHref ? (
                <Link
                  href={tournamentHref}
                  className="free-tickets-overview__logo-btn"
                  title={`${track.name} — ${t("gameModalities.enterTournament")}`}
                  onClick={() => onSelectTrack?.(track)}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="free-tickets-overview__logo" />
                  ) : (
                    <span className="free-tickets-overview__logo free-tickets-overview__monogram">
                      {track.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  className="free-tickets-overview__logo-btn"
                  onClick={() => onSelectTrack?.(track)}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="free-tickets-overview__logo" />
                  ) : (
                    <span className="free-tickets-overview__logo free-tickets-overview__monogram">
                      {track.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </button>
              )}

              <p className="free-tickets-overview__track-name" title={track.name}>
                {track.name}
              </p>

              <div className="free-tickets-overview__dots">
                {TICKET_NUMS.map((num) => {
                  const used = isTrackTicketUsed(track.slug, num);
                  const isTicketActive = isActive && activeTicketNum === num;

                  return (
                    <button
                      key={num}
                      type="button"
                      className={`free-tickets-overview__slot${
                        used ? " free-tickets-overview__slot--used" : " free-tickets-overview__slot--open"
                      }${isTicketActive ? " free-tickets-overview__slot--active" : ""}`}
                      aria-label={
                        used
                          ? `${track.name} — ${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketUsed")}`
                          : `${track.name} — ${t("gameModalities.ticketLabel")} ${num} — ${t("gameModalities.ticketAvailable")}`
                      }
                      onClick={() => onSelectTicket?.(track, num)}
                    >
                      {used ? <Check className="free-tickets-overview__check" strokeWidth={3} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
