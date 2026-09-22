"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { getTopTicketsToday } from "@/frontend/lib/profileHubInsights";
import {
  buildTrackTicketHistory,
  filterHistoryTracks,
  getHistoryMonths,
  buildMonthGrid,
  MONTH_KEYS,
} from "@/frontend/lib/profileTicketHistory";
import { profileHubAsset } from "@/frontend/lib/config/profileHubAssets";
import { getTrackImageUrl } from "@/frontend/lib/tournamentImages";
import ProfileTopTicketsToday from "@/frontend/components/profile/hub/ProfileTopTicketsToday";
import { fetchAuthJson, fetchJson } from "@/frontend/lib/api/client";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";

const TABS = [
  { id: "today", labelKey: "profile.hub.historyTabToday", iconKey: "iconHistoryTabToday" },
  { id: "recent", labelKey: "profile.hub.historyTabRecent", iconKey: "iconHistoryTabRecent" },
  { id: "full", labelKey: "profile.hub.historyTabFull", iconKey: "iconHistoryTabFull" },
];

function MiniMonthCalendar({ t, year, monthIndex, activeDates, compact = false }) {
  const cells = buildMonthGrid(year, monthIndex);
  const monthLabel = t(`profile.hub.months.${MONTH_KEYS[monthIndex]}`);

  return (
    <div className={`profile-hub-cal${compact ? " profile-hub-cal--compact" : ""}`}>
      <p className="profile-hub-cal__month">{monthLabel}</p>
      <div className="profile-hub-cal__grid">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <span key={`empty-${idx}`} className="profile-hub-cal__cell profile-hub-cal__cell--empty" />;
          }
          const played = activeDates.has(cell.dateKey);
          return (
            <span
              key={cell.dateKey}
              className={`profile-hub-cal__cell${played ? " profile-hub-cal__cell--played" : ""}`}
            >
              {played ? (
                <span className="profile-hub-cal__ticket-day">
                  <span className="profile-hub-cal__day-num">{cell.day}</span>
                </span>
              ) : (
                cell.day
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HistoryCalendarPanel({ t, tracks, mode, selectedTrackSlug, onSelectTrack, searchQuery, onSearchChange }) {
  const months = getHistoryMonths(mode);

  if (tracks.length === 0) {
    return <p className="profile-hub-history__empty">{t("profile.hub.historyEmpty")}</p>;
  }

  return (
    <div className="profile-hub-history__layout">
      <div className="profile-hub-history__calendars">
        {tracks.map((track) => {
          const dateSet = new Set(track.dates);
          return (
            <section
              key={track.slug}
              id={`profile-history-track-${track.slug}`}
              className={`profile-hub-history__track-block${
                selectedTrackSlug === track.slug ? " profile-hub-history__track-block--active" : ""
              }`}
            >
              <h4 className="profile-hub-history__track-title">{track.name.toUpperCase()}</h4>
              <div
                className={`profile-hub-history__month-grid${
                  mode === "full" ? " profile-hub-history__month-grid--full" : ""
                }`}
              >
                {months.map(({ year, monthIndex }) => (
                  <MiniMonthCalendar
                    key={`${track.slug}-${year}-${monthIndex}`}
                    t={t}
                    year={year}
                    monthIndex={monthIndex}
                    activeDates={dateSet}
                    compact={mode === "full"}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="profile-hub-history__sidebar">
        <label className="profile-hub-history__search">
          <img src={profileHubAsset("iconHistorySearch")} alt="" className="profile-hub-history__search-icon" />
          <input
            type="search"
            value={searchQuery}
            placeholder={t("profile.hub.historySearchPlaceholder")}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <ul className="profile-hub-history__track-list">
          {tracks.map((track) => {
            const logo = track.imageUrl || getTrackImageUrl(track.name, track.imageUrl) || null;
            return (
              <li key={track.slug}>
                <button
                  type="button"
                  className={`profile-hub-history__track-row${
                    selectedTrackSlug === track.slug ? " profile-hub-history__track-row--active" : ""
                  }`}
                  onClick={() => {
                    onSelectTrack(track.slug);
                    document.getElementById(`profile-history-track-${track.slug}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                    });
                  }}
                >
                  {logo ? (
                    <img src={logo} alt="" className="profile-hub-history__track-logo" />
                  ) : (
                    <span className="profile-hub-history__track-monogram">
                      {track.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="profile-hub-history__track-label">{track.name}</span>
                  <img
                    src={profileHubAsset("iconHistoryCalendarBtn")}
                    alt=""
                    className="profile-hub-history__track-cal-btn"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

function GuestHistoryUpsell({ t }) {
  return (
    <div className="profile-hub-history__guest">
      <p className="profile-hub-history__guest-title">{t("profile.hub.historyGuestTitle")}</p>
      <p className="profile-hub-history__guest-body">{t("profile.hub.historyGuestBody")}</p>
      <Link href="/register" className="profile-hub-history__guest-cta">
        {t("profile.hub.historyGuestCta")}
      </Link>
    </div>
  );
}

export default function ProfileTicketHistoryPanel({
  t: propT,
  profile,
  isRegistered = false,
  liveTracks = [],
}) {
  const { t: contextT, language } = useLanguage();
  const t = propT || contextT;
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrackSlug, setSelectedTrackSlug] = useState(null);

  const [guestToken, setGuestToken] = useState(null);
  const [guestTickets, setGuestTickets] = useState([]);
  const [top5Tickets, setTop5Tickets] = useState([]);
  const [selectedGuestTicket, setSelectedGuestTicket] = useState(null);
  const [selectedSacrificeTicket, setSelectedSacrificeTicket] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestToken(localStorage.getItem("50points_guest_token"));
    }
  }, []);

  useEffect(() => {
    if (activeTab === "claim" && guestToken) {
      fetchJson(`/profile/guest-tickets?guestToken=${guestToken}`)
        .then((data) => {
          setGuestTickets(data.tickets || []);
          if (data.tickets && data.tickets.length > 0) {
            setSelectedGuestTicket(data.tickets[0]);
          }
        })
        .catch((err) => console.error("Error fetching guest tickets:", err));

      fetchAuthJson("/profile/top-5")
        .then((data) => {
          setTop5Tickets(data.top5 || []);
          if (data.top5 && data.top5.length > 0) {
            setSelectedSacrificeTicket(data.top5[0]);
          }
        })
        .catch((err) => console.error("Error fetching top 5 tickets:", err));
    }
  }, [activeTab, guestToken]);

  const tabsToShow = useMemo(() => {
    if (isRegistered && guestToken) {
      return [
        ...TABS,
        { id: "claim", labelKey: "profile.hub.historyTabClaim", iconKey: "iconHistoryTabClaim" },
      ];
    }
    return TABS;
  }, [isRegistered, guestToken]);

  const handleClaim = async () => {
    if (!guestToken || !selectedGuestTicket) return;

    if (top5Tickets.length > 0 && !selectedSacrificeTicket) {
      setClaimError("Debes seleccionar un ticket de tu Top 5 para sacrificar.");
      return;
    }

    setClaiming(true);
    setClaimError("");
    setClaimSuccess("");

    try {
      const res = await fetchAuthJson("/profile/claim", {
        method: "POST",
        body: JSON.stringify({
          guestToken,
          tournamentId: selectedGuestTicket.tournamentId,
          ticketNumber: selectedGuestTicket.ticketNumber,
          sacrificeTournamentId: selectedSacrificeTicket?.tournamentId ?? null,
          sacrificeTicketNumber: selectedSacrificeTicket?.ticketNumber ?? null,
        }),
      });

      if (res.ok) {
        setClaimSuccess("¡Ticket reclamado con éxito! Se ha agregado a tu historial.");
        
        const remaining = guestTickets.filter(
          (t) =>
            t.tournamentId !== selectedGuestTicket.tournamentId ||
            t.ticketNumber !== selectedGuestTicket.ticketNumber
        );
        setGuestTickets(remaining);
        setSelectedGuestTicket(remaining[0] || null);

        if (remaining.length === 0) {
          localStorage.removeItem("50points_guest_token");
          setGuestToken(null);
        }

        window.dispatchEvent(new Event("50points-tickets-updated"));
      } else {
        setClaimError(res.message || "Error al reclamar el ticket.");
      }
    } catch (err) {
      console.error(err);
      setClaimError("Ocurrió un error inesperado al procesar la reclamación.");
    } finally {
      setClaiming(false);
    }
  };

  const historyTracks = useMemo(
    () => buildTrackTicketHistory(profile?.allTickets ?? [], liveTracks),
    [profile?.allTickets, liveTracks],
  );

  const filteredTracks = useMemo(
    () => filterHistoryTracks(historyTracks, searchQuery),
    [historyTracks, searchQuery],
  );

  const showCalendar = isRegistered && (activeTab === "recent" || activeTab === "full");
  const topRows = getTopTicketsToday(profile?.allTickets ?? [], profile?.tournamentSummaries ?? []);

  return (
    <section className="profile-hub-history" id="profile-tickets" aria-label={t("profile.hub.historyAria")}>
      <div className="profile-hub-history__tabs" role="tablist">
        {tabsToShow.map((tab) => {
          const icon = profileHubAsset(tab.iconKey);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`profile-hub-history__tab${isActive ? " profile-hub-history__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {icon ? <img src={icon} alt="" className="profile-hub-history__tab-icon" /> : null}
              <span>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>

      <div className="profile-hub-history__panel" role="tabpanel">
        {activeTab === "today" ? (
          <>
            <ProfileTopTicketsToday t={t} profile={profile} embedded />
            {!isRegistered && topRows.length === 0 ? (
              <p className="profile-hub-history__guest-hint">{t("profile.hub.historyGuestHint")}</p>
            ) : null}
          </>
        ) : null}

        {activeTab === "recent" && !isRegistered ? <GuestHistoryUpsell t={t} /> : null}
        {activeTab === "full" && !isRegistered ? <GuestHistoryUpsell t={t} /> : null}

        {activeTab === "recent" && showCalendar ? (
          <HistoryCalendarPanel
            t={t}
            tracks={filteredTracks}
            mode="recent"
            selectedTrackSlug={selectedTrackSlug}
            onSelectTrack={setSelectedTrackSlug}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : null}

        {activeTab === "full" && showCalendar ? (
          <HistoryCalendarPanel
            t={t}
            tracks={filteredTracks}
            mode="full"
            selectedTrackSlug={selectedTrackSlug}
            onSelectTrack={setSelectedTrackSlug}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : null}

        {showCalendar ? (
          <div className="profile-hub-history__actions">
            <button type="button" className="profile-hub-history__action-btn">
              {t("profile.hub.historyEdit")}
            </button>
            <button type="button" className="profile-hub-history__action-btn">
              {t("profile.hub.historyShare")}
            </button>
          </div>
        ) : null}

        {activeTab === "claim" ? (
          <div className="profile-hub-claim-panel" style={{ padding: "1.5rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff", marginBottom: "0.5rem" }}>
              {isEn ? "Claim Guest Tickets (Modality 4)" : "Reclamar Tickets de Invitado (Modalidad 4)"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              {isEn
                ? "Transfer your picks made in Guest mode to your registered account. When claiming a ticket, the original creation alias is preserved (e.g. \"Maria Won\") and you must sacrifice one ticket from your Personal Top 5."
                : "Transfiere tus jugadas hechas en modo Invitado a tu cuenta registrada. Al reclamar un ticket, se preserva el alias original de creación (ej. \"Maria Won\") y debes sacrificar un ticket de tu Top 5 Personal."}
            </p>

            {claimSuccess && (
              <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "0.5rem", color: "#34d399", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "1rem" }}>
                ✓ {claimSuccess}
              </div>
            )}

            {claimError && (
              <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "1rem" }}>
                ⚠️ {claimError}
              </div>
            )}

            {!guestToken || guestTickets.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "2rem 0" }}>
                {isEn ? "You have no pending guest tickets to claim in this browser." : "No tienes tickets de invitado pendientes por reclamar en este navegador."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* 1. Select guest ticket to claim */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                    {isEn ? "1. Select the guest ticket to claim:" : "1. Selecciona el ticket de invitado a reclamar:"}
                  </label>
                  <select
                    value={selectedGuestTicket ? `${selectedGuestTicket.tournamentId}-${selectedGuestTicket.ticketNumber}` : ""}
                    onChange={(e) => {
                      const [tId, tNum] = e.target.value.split("-").map(Number);
                      const found = guestTickets.find((t) => t.tournamentId === tId && t.ticketNumber === tNum);
                      setSelectedGuestTicket(found);
                    }}
                    style={{ width: "100%", padding: "0.75rem", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#fff", outline: "none", fontWeight: "bold" }}
                  >
                    {guestTickets.map((t) => (
                      <option key={`${t.tournamentId}-${t.ticketNumber}`} value={`${t.tournamentId}-${t.ticketNumber}`}>
                        {t.tournamentName} ({t.track}) — {t.totalPoints} Pts ({isEn ? "Ticket" : "Boleto"} #{t.ticketNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Select sacrifice ticket */}
                {top5Tickets.length > 0 ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      {isEn ? "2. Select ticket to sacrifice (from your Top 5):" : "2. Selecciona el ticket a sacrificar (de tu Top 5):"}
                    </label>
                    <select
                      value={selectedSacrificeTicket ? `${selectedSacrificeTicket.tournamentId}-${selectedSacrificeTicket.ticketNumber}` : ""}
                      onChange={(e) => {
                        const [tId, tNum] = e.target.value.split("-").map(Number);
                        const found = top5Tickets.find((t) => t.tournamentId === tId && t.ticketNumber === tNum);
                        setSelectedSacrificeTicket(found);
                      }}
                      style={{ width: "100%", padding: "0.75rem", background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#fff", outline: "none", fontWeight: "bold" }}
                    >
                      {top5Tickets.map((t) => (
                        <option key={`${t.tournamentId}-${t.ticketNumber}`} value={`${t.tournamentId}-${t.ticketNumber}`}>
                          {t.tournamentName} ({t.track}) — {t.totalPoints} Pts ({isEn ? "Ticket" : "Boleto"} #{t.ticketNumber})
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.5rem", fontWeight: "bold" }}>
                      {isEn ? "* WARNING: The ticket selected here will be PERMANENTLY DELETED." : "* ADVERTENCIA: El ticket seleccionado aquí será ELIMINADO de forma permanente."}
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                    {isEn ? "You don't have tickets in your registered account yet. Claim the guest ticket directly without sacrificing." : "No tienes tickets en tu cuenta registrada aún. Reclama el ticket de invitado directamente sin sacrificar."}
                  </p>
                )}

                {/* 3. Action button */}
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claiming}
                  style={{
                    marginTop: "1rem",
                    width: "100%",
                    padding: "1rem",
                    background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: claiming ? "not-allowed" : "pointer",
                    opacity: claiming ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  {claiming ? (isEn ? "Processing..." : "Procesando...") : (isEn ? "Confirm Swap & Claim" : "Confirmar Intercambio y Reclamar")}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
