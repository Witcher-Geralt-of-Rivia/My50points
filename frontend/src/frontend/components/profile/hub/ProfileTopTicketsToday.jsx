"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getTopTicketsToday } from "@/frontend/lib/profileHubInsights";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function ProfileTopTicketsToday({ t, profile, embedded = false }) {
  const [expanded, setExpanded] = useState(false);
  const rows = getTopTicketsToday(profile?.allTickets ?? [], profile?.tournamentSummaries ?? []);

  return (
    <section className={`profile-hub-top5${embedded ? " profile-hub-top5--embedded" : ""}`}>
      <h3 className="profile-hub-top5__title">{t("profile.hub.topTicketsTitle")}</h3>

      {rows.length === 0 ? (
        <p className="profile-hub-top5__empty">{t("profile.hub.topTicketsEmpty")}</p>
      ) : (
        <div className="profile-hub-top5__table-wrap">
          <table className="profile-hub-top5__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("profile.hub.topTicketsTrack")}</th>
                <th>{t("profile.hub.topTicketsTicket")}</th>
                <th>{t("profile.hub.topTicketsScore")}</th>
              </tr>
            </thead>
            <tbody>
              {(expanded ? rows : rows.slice(0, 5)).map((row) => (
                <tr key={`${row.rank}-${row.track}-${row.points}`}>
                  <td>
                    {row.rank <= 3 ? (
                      <span aria-hidden>{MEDAL[row.rank - 1]}</span>
                    ) : (
                      row.rank
                    )}
                  </td>
                  <td>{row.track}</td>
                  <td>{row.ticketLabel}</td>
                  <td>
                    {row.points.toLocaleString()} {t("common.pts")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 5 ? (
        <button
          type="button"
          className="profile-hub-top5__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("profile.hub.topTicketsLess") : t("profile.hub.topTicketsMore")}
          <ChevronDown
            className={`profile-hub-top5__chevron${expanded ? " profile-hub-top5__chevron--open" : ""}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      ) : null}
    </section>
  );
}
