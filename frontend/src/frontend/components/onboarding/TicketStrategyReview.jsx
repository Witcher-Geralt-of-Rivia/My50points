"use client";

import { ArrowLeft, Check, Pencil, Trash2, Trophy } from "lucide-react";
import { strategies } from "@/frontend/components/tournament/PickSelector";
import { buildTicketReviewData } from "@/frontend/lib/ticketRaceSummary";
import {
  strategyTicketAsset,
  ticketDesignAssets,
} from "@/frontend/lib/config/ticketDesignAssets";

function StrategyPointsBadge({ strategyId }) {
  const strategy = strategies.find((s) => s.id === strategyId);
  if (!strategy) return null;

  const tone =
    strategyId === "full" ? "ticket-review__points--full" :
    strategyId === "dual" ? "ticket-review__points--dual" :
    "ticket-review__points--smart";

  return (
    <div className={`ticket-review__points ${tone}`}>
      <img
        className="ticket-review__strategy-art"
        src={strategyTicketAsset(strategyId)}
        alt=""
        aria-hidden
      />
      <div className="ticket-review__strategy-copy">
        <span className="ticket-review__strategy-name">{strategy.name}</span>
        <span className="ticket-review__strategy-pts">
          {strategy.allocation.join(strategy.allocation.length > 1 ? " · " : "")} pts
        </span>
      </div>
    </div>
  );
}

export default function TicketStrategyReview({
  trackName,
  ticketNum,
  tournament,
  submittedTickets,
  onEditRace,
  onClear,
  onBack,
  onConfirmTicket,
  clearing = false,
  confirming = false,
  readOnly = false,
  t,
}) {
  const { rows, breakdown, allReady } = buildTicketReviewData(
    tournament,
    submittedTickets,
    ticketNum,
  );
  const displayTrack = trackName || tournament?.track || tournament?.name || "Track";

  return (
    <div className="ticket-review">
      <header className="ticket-review__head">
        <div className="ticket-review__venue">
          <img
            className="ticket-review__venue-logo"
            src={ticketDesignAssets.horseHeadLogo.svg}
            alt=""
            aria-hidden
          />
          <div>
            <p className="ticket-review__venue-name">{displayTrack}</p>
            {tournament?.location ? (
              <p className="ticket-review__venue-loc">{tournament.location}</p>
            ) : null}
            <p className="ticket-review__venue-sub">
              {t("gameModalities.ticketLabel")} {ticketNum} · {t("gameModalities.ticketReviewTournament")}
            </p>
          </div>
        </div>
        <div className="ticket-review__head-badge">
          <span className="ticket-review__tournament-pill">
            {t("gameModalities.ticketReviewTournament")}
          </span>
          <img
            className="ticket-review__badge-50"
            src={ticketDesignAssets.badge50MyPoints.svg}
            alt=""
            aria-hidden
          />
        </div>
      </header>

      <h2 className="ticket-review__title">{t("gameModalities.ticketReviewTitle")}</h2>

      <ul className="ticket-review__rows">
        {rows.map((row) => (
          <li key={row.raceId} className="ticket-review__row">
            <span className="ticket-review__race-num">
              {t("gameModalities.raceLabel")} {row.raceNumber}
            </span>
            <div className="ticket-review__row-strategy">
              {row.strategyId ? <StrategyPointsBadge strategyId={row.strategyId} /> : "—"}
            </div>
            <div className="ticket-review__row-picks">
              {row.posts.length
                ? row.posts.map((post, index) => (
                    <span key={`${row.raceId}-post-${index}`} className="ticket-review__pick">
                      {post}
                    </span>
                  ))
                : "—"}
            </div>
            <div className="ticket-review__row-actions">
              {row.ready ? (
                <Check className="ticket-review__ready-icon" size={16} aria-hidden />
              ) : null}
              {!readOnly ? (
                <button
                  type="button"
                  className="ticket-review__edit"
                  onClick={() => onEditRace?.(row.raceId)}
                >
                  <Pencil size={12} aria-hidden />
                  {t("gameModalities.ticketReviewEdit")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section className="ticket-review__breakdown">
        <h3 className="ticket-review__breakdown-title">{t("gameModalities.ticketReviewBreakdown")}</h3>
        <div className="ticket-review__breakdown-grid">
          {breakdown.map((item) => (
            <div key={item.id} className={`ticket-review__breakdown-card ticket-review__breakdown-card--${item.id}`}>
              <img
                className="ticket-review__breakdown-art"
                src={strategyTicketAsset(item.id)}
                alt=""
                aria-hidden
              />
              <span className="ticket-review__breakdown-label">{item.label}</span>
              <span className="ticket-review__breakdown-pct">{item.pct.toFixed(1)}%</span>
              <span className="ticket-review__breakdown-count">
                {item.count} {t("gameModalities.ticketReviewRaces")}
              </span>
              <div className="ticket-review__breakdown-bar">
                <span style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {!readOnly ? (
        <footer className="ticket-review__footer">
          <button
            type="button"
            className="ticket-review__footer-btn ticket-review__footer-btn--clear"
            onClick={onClear}
            disabled={clearing || confirming}
          >
            <Trash2 size={14} aria-hidden />
            {clearing ? "..." : t("gameModalities.ticketReviewClear")}
          </button>
          <button
            type="button"
            className="ticket-review__footer-btn ticket-review__footer-btn--back"
            onClick={onBack}
            disabled={clearing || confirming}
          >
            <ArrowLeft size={14} aria-hidden />
            {t("gameModalities.ticketReviewBack")}
          </button>
          <button
            type="button"
            className="ticket-review__footer-btn ticket-review__footer-btn--confirm"
            onClick={onConfirmTicket}
            disabled={!allReady || clearing || confirming}
          >
            <Trophy size={14} aria-hidden />
            {confirming ? "..." : t("gameModalities.ticketReviewConfirm")}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
