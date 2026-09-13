"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { staticFile } from "@/frontend/lib/config/paths";
import {
  BrowserTabs,
  BrowserTabBar,
  BrowserTab,
} from "@/frontend/components/ui/BrowserTabBar";
import { isTrackTicketUsed } from "@/frontend/lib/trackTicketUsage";

function TrackCountdown({ eventDate }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const target = new Date(eventDate);
    if (isNaN(target.getTime())) return;

    const tick = () => {
      const now = new Date();
      const diff = target - now;

      const isToday = target.toDateString() === now.toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = target.toDateString() === tomorrow.toDateString();

      const localTimeStr = target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      if (diff <= 0) {
        if (isToday) {
          setTimeLeft(`HOY ${localTimeStr}`);
        } else {
          setTimeLeft("PRÓXIMO");
        }
        return;
      }

      const days = Math.floor(diff / (24 * 3600000));
      const hours = Math.floor((diff % (24 * 3600000)) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (isToday) {
        if (hours < 6) {
          if (hours > 0) {
            setTimeLeft(`En: ${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`En: ${minutes}m`);
          }
        } else {
          setTimeLeft(`HOY ${localTimeStr}`);
        }
      } else if (isTomorrow) {
        setTimeLeft(`MAÑANA ${localTimeStr}`);
      } else {
        setTimeLeft(`En: ${days}d ${hours}h`);
      }
    };

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [eventDate]);

  if (!timeLeft) return null;

  const isSpec = timeLeft.startsWith("HOY") || timeLeft.startsWith("MAÑANA") || timeLeft === "PRÓXIMO";

  return (
    <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full select-none shadow-md ${
      isSpec ? "bg-[#7c3aed] text-white" : "bg-[#fbbf24] text-black"
    }`}>
      ⏱️ {timeLeft}
    </span>
  );
}

export default function TracksWorkflowAccordion({
  tracks,
  modalityId,
  loading,
  t,
  workflow,
  onTrackClick = null,
}) {
  const router = useRouter();

  if (loading) {
    return <p className="tracks-workflow__status">{t("gameModalities.loading")}</p>;
  }

  if (tracks.length === 0) {
    return <p className="tracks-workflow__status">{t("tournamentsSection.empty")}</p>;
  }

  return (
    <div className="tracks-accordion-shell" id="tracks-workflow-tabs">
      <BrowserTabs className="browser-tabs--tracks browser-tabs--tracks-primary">
        <BrowserTabBar
          className="browser-tabs__bar--tracks"
          role="tablist"
          aria-label={t("tournamentsSection.title")}
          style={workflow?.expandedSlug ? { display: 'flex', justifyContent: 'center', gridTemplateColumns: 'none' } : undefined}
        >
          {tracks.map((track) => {
            const isActiveTrack = workflow?.expandedSlug === track.slug;
            const used1 = isTrackTicketUsed(track.slug, 1);
            const used2 = isTrackTicketUsed(track.slug, 2);
            const used3 = isTrackTicketUsed(track.slug, 3);

            const startDateObj = track.startDate || (track.eventDate ? new Date(track.eventDate) : null);
            const endDateObj = track.endDate || null;
            const hasValidDate = startDateObj && !isNaN(startDateObj.getTime());

            let statusType = "UPCOMING";
            if (track.finished) {
              statusType = "FINISHED";
            } else if (track.live) {
              statusType = "LIVE";
            } else if (hasValidDate) {
              const now = new Date();
              if (now < startDateObj) {
                statusType = "UPCOMING";
              } else if (endDateObj && now > endDateObj) {
                statusType = "FINISHED";
              } else {
                statusType = "LIVE";
              }
            }

            const formattedDate = hasValidDate
              ? startDateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
              : "PRÓXIMAMENTE";
            const formattedTimeStart = hasValidDate
              ? startDateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : "";
            const formattedTimeEnd = endDateObj && !isNaN(endDateObj.getTime())
              ? endDateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : "";

            return (
              <BrowserTab
                key={track.slug}
                id={`track-tab-${track.slug}`}
                active={isActiveTrack}
                className={`browser-tabs__tab--track browser-tabs__tab--track-rich${
                  statusType === "LIVE" ? " browser-tabs__tab--track-live" : ""
                } tour-step-track-tab`}
                style={{ maxWidth: '260px', width: '100%' }}
                onClick={() => {
                  if (onTrackClick) {
                    onTrackClick(track);
                  } else if (track.tournamentSlug) {
                    router.push(
                      `/tournament/${track.tournamentSlug}?modality=${modalityId}&track=${track.slug}&ticket=1`
                    );
                  }
                }}
              >
                <span className="browser-tabs__tab-thumb-wrap">
                  <img
                    src={track.imageUrl || staticFile("/images/live-feed.jpg")}
                    alt={track.name}
                    className="browser-tabs__tab-thumb"
                  />

                  {/* Top Status Badge (Left) */}
                  {statusType === "FINISHED" ? (
                    <span className="mw-card-status-pill mw-card-status-pill--finished">
                      🏁 FINALIZADO
                    </span>
                  ) : statusType === "LIVE" ? (
                    <span className="mw-card-status-pill mw-card-status-pill--live">
                      <span className="mw-card-live-dot" aria-hidden />
                      🔴 EN VIVO
                    </span>
                  ) : (
                    <span className="mw-card-status-pill mw-card-status-pill--available">
                      🟢 DISPONIBLE
                    </span>
                  )}

                  {/* Top Countdown Badge (Right) */}
                  {statusType === "UPCOMING" && track.eventDate ? (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <TrackCountdown eventDate={track.eventDate} />
                    </div>
                  ) : null}
                </span>

                <span className="browser-tabs__tab-pill">🏇 {track.name}</span>

                {/* API Date, Time & Races Metadata Box */}
                <div className="mw-card-meta-box">
                  <div className="mw-card-meta-row">
                    <span>📅 {formattedDate}</span>
                  </div>
                  {formattedTimeStart ? (
                    <div className="mw-card-meta-row mw-card-meta-row--sub">
                      <span>⏱️ {formattedTimeStart}{formattedTimeEnd ? ` — ${formattedTimeEnd}` : ''}</span>
                    </div>
                  ) : null}
                  <div className="mw-card-meta-row mw-card-meta-row--sub">
                    <span>🏆 7 Carreras del Torneo</span>
                  </div>
                </div>

                <div className="mw-tickets-vault-pill">
                  <span className="mw-tickets-vault-label">TICKETS:</span>
                  <span className={`mw-ticket-badge ${used1 ? "mw-ticket-badge--used" : "mw-ticket-badge--active"}`} title={used1 ? "Ticket 1 Usado" : "Ticket 1 Disponible"}>🎫</span>
                  <span className={`mw-ticket-badge ${used2 ? "mw-ticket-badge--used" : "mw-ticket-badge--active"}`} title={used2 ? "Ticket 2 Usado" : "Ticket 2 Disponible"}>🎫</span>
                  <span className={`mw-ticket-badge ${used3 ? "mw-ticket-badge--used" : "mw-ticket-badge--active"}`} title={used3 ? "Ticket 3 Usado" : "Ticket 3 Disponible"}>🎫</span>
                </div>

                {statusType === "FINISHED" ? (
                  <span className="browser-tabs__tab-enter browser-tabs__tab-enter--results">
                    📊 VER RESULTADOS FINALIZADOS ›
                  </span>
                ) : statusType === "LIVE" ? (
                  <span className="browser-tabs__tab-enter">
                    🔴 EN VIVO — VER CARRERAS ›
                  </span>
                ) : (
                  <span className="browser-tabs__tab-enter">
                    ⚡ {t("tournamentsSection.enterTournament")}
                    <span className="browser-tabs__tab-enter-arrow" aria-hidden>›</span>
                  </span>
                )}
              </BrowserTab>
            );
          })}
        </BrowserTabBar>
      </BrowserTabs>
    </div>
  );
}

